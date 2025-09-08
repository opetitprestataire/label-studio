# Label Stream: Task Selection, Queues, and Sampling

## Overview

This document explains how Label Studio selects the next task for an annotator when they enter the Label Stream ("Label All Tasks"). It consolidates behavior from `label_studio/projects/functions/next_task.py` and relevant project settings described in docs. It covers:

- Inputs and task/annotation states
- Queueing and prioritization rules
- Sampling strategies and fallbacks
- Skip/postpone flows
- Locking and concurrency
- Enterprise-specific agreement threshold behavior
- Feature flags that alter behavior

## Key Concepts and Entities

- **Task**: Unit of work with attributes such as `is_labeled`, `overlap`, predictions, timestamps, etc.
- **Annotation**: User submission for a task (may be cancelled/skipped). Multiple annotations per task for overlap.
- **Prepared tasks**: The base `QuerySet` of tasks eligible for the current session/filters (from Data Manager and/or assignments).
- **Assigned flag**: Indicates manual assignment; when set, assigned tasks take precedence over general queues.
- **DM queue**: Data Manager ordering is respected (e.g., user clicked "Label All Tasks" with a specific sort/filter selection).
- **Sampling**: Strategy to choose the next task among eligible ones: `SEQUENCE`, `UNCERTAINTY`, `UNIFORM`.
- **Locks**: Short-lived per-user locks to prevent concurrent selection of the same task.

## Inputs to the Label Stream Engine

- `user`: Current annotator.
- `project`: Current project (includes settings, sampling mode, overlap rules, feature flags, enterprise fields).
- `prepared_tasks`: QuerySet pre-filtered by Data Manager selection and visibility permissions.
- `dm_queue`: Whether Data Manager queue ordering is actively used.
- `assigned_flag`: Whether the annotator has manual assignments that must be served first.

## Task and Annotation States

- Task
  - `is_labeled`: True if the task is considered complete for labeling (reaches required overlap or business completion criteria).
  - `overlap`: Required number of annotations for completion (>= 1).
  - Predictions: `predictions.model_version`, `predictions.cluster`, `predictions.score` (for uncertainty sampling).
  - Locks: Labeling locks held per user.
  - Flags: Included via settings such as `show_overlap_first`, `show_ground_truth_first`.
- Annotation
  - `completed_by`: Author.
  - `was_cancelled`: True for skipped.
  - Drafts: may be `was_postponed`.

## High-Level Flow

```mermaid
flowchart TD
  A[Start get_next_task] --> B[Compute not_solved_tasks]
  B -->|assigned_flag True| C[Use assigned tasks (first)]
  C --> L[Return task (no lock set)]
  B -->|assigned_flag False| D[Check existing lock for user]
  D -->|Lock exists| L
  D --> E{Prioritized on low agreement?}
  E -->|Yes| F[Pick first unlocked from low-agreement-ordered tasks]
  E -->|No| G{show_ground_truth_first?}
  F --> H
  G -->|Yes| I[Try ground-truth tasks]
  G -->|No| H{maximum_annotations > 1?}
  I --> H
  H -->|Yes| J[Try breadth-first (tasks with max annotations)]
  H -->|No| K{Feature flag overlap-first routing?}
  J --> K
  K -->|New overlap-first| O[Filter to overlap>1 then sample]
  K -->|Legacy/Disabled| P[Maybe pre-filter overlap>1 earlier]
  O --> Q[Sampling by project.sampling]
  P --> Q
  Q --> R{dm_queue?}
  R -->|Yes and none yet| S[Use DM ordering: first()]
  R -->|No or already chosen| T[Postponed draft queue]
  S --> T
  T --> U[Skipped queue]
  U --> V{Have task?}
  V -->|Yes and lock needed| W[Set lock for user]
  V -->|No| X[Return None]
  W --> Y[Record stream history]
  L --> Y
  Y --> Z[Finish]
```

## Detailed Steps and Rules

1. Build `not_solved_tasks`
   - Start from `prepared_tasks` and exclude tasks already annotated by the user.
   - Exclude the user’s postponed drafts when applicable.
   - Enterprise (if feature flag and settings enabled): include tasks already labeled but with agreement below a threshold; otherwise filter to `is_labeled=False`.
   - Optionally pre-filter to `overlap>1` first when configured and not already prioritized on low agreement.

2. Early exits and locks
   - If `assigned_flag` is set: return the first assigned task without setting a lock (manual queue).
   - If the user already holds a task lock within `not_solved_tasks`: return it without setting a new lock.

3. Priority queues before sampling
   - Low agreement queue (Enterprise): if prioritized, pick the first unlocked task.
   - Ground truth queue: if enabled, prefer tasks with ground-truth annotations.
   - Breadth-first queue: when `maximum_annotations>1`, prefer tasks with the highest existing annotation count (finishing in-progress tasks sooner).

4. Overlap-first routing (two modes)
   - Legacy (pre-flag): pre-filter `overlap>1` in the `not_solved_tasks` stage.
   - New (flagged): construct the overlap>1 subset and perform sampling within that subset. If none found, fall back to the full set.

5. Sampling strategies
   - `SEQUENCE`: first unlocked task by ordering.
   - `UNCERTAINTY`:
     - Consider tasks with predictions matching current `project.model_version`.
     - Cluster-aware de-biasing: score tasks by how many tasks the user already solved in the same cluster; prefer less-solved clusters and lower `predictions.score`.
     - Randomize among the top N to reduce annotator collisions when many annotators are online.
     - Fallback to random uniform sampling if no current predictions.
   - `UNIFORM`: random unlocked within the candidate set.

6. Postponed and skipped queues
   - Postponed drafts: if the user has postponed drafts for this project, present them first; suppress postpone option for the returned task.
   - Skipped (Requeue-for-me): if project skip policy is `REQUEUE_FOR_ME`, return previously skipped tasks by this user in FIFO order.

7. Locking and finish
   - If a task was selected via queues/sampling and a lock is needed, set a lock with TTL proportional to the average lead time.
   - Append stream history for analytics/debugging; return task and a human-readable `queue_info` string indicating which path was used.

## Enterprise Agreement Threshold Behavior

When the Enterprise feature flag and project’s LSE fields are enabled:

- The engine can include tasks that are already labeled but whose agreement is below `agreement_threshold`.
- It also caps the number of additional annotators per task via `max_additional_annotators_assignable` to avoid infinite reassignment.
- Low-agreement tasks can be prioritized by ordering the candidate set by `-is_labeled` then ascending agreement (labeled-low-agreement first), and sampling within this ordered sequence.

## Skip/Postpone Semantics

- Skip produces a cancelled annotation. If `SkipQueue.REQUEUE_FOR_ME` is configured, the task returns to the user later.
- Postpone records a draft flagged as postponed; postponed drafts are elevated in priority on re-entry into the stream.

## Concurrency and Locks

- Locks are set via `Task.set_lock(user)` and queried via `Task.get_locked_by(user)` and `task.has_lock(user)`.
- Database `select_for_update(skip_locked=True)` is used to reduce collisions when probing candidate tasks.

```mermaid
sequenceDiagram
  participant U as User
  participant LS as Label Stream Engine
  participant DB as DB
  U->>LS: Request next task
  LS->>DB: Probe candidate ids (ordered/randomized)
  loop Until unlocked
    LS->>DB: select_for_update(skip_locked)
    alt Task unlocked & no user lock
      LS->>DB: set_lock(user)
      break
    else Task locked
      LS->>DB: try next id
    end
  end
  LS-->>U: Return task + queue_info
```

## Feature Flags That Affect Behavior (non-exhaustive)

- `fflag_fix_back_lsdv_4523_show_overlap_first_order_27022023_short`: Enables the newer overlap-first routing.
- `fflag_feat_optic_161_project_settings_for_low_agreement_threshold_score_short`: Enables low-agreement prioritization under LSE.
- `fflag_feat_all_leap_1825_annotator_evaluation_short`: Onboarding mode nuance for `is_labeled` filtering.
- `fflag_fix_back_dev_4185_next_task_additional_logging_long`: Adds verbose debug logging.

## Settings That Influence Flow

- Project-level
  - `sampling`: `SEQUENCE` | `UNCERTAINTY` | `UNIFORM`
  - `maximum_annotations`: upper bound for concurrency and breadth-first behavior
  - `show_overlap_first`, `show_ground_truth_first`
  - Skip policy: `SkipQueue.REQUEUE_FOR_ME`
- Enterprise project-level
  - `agreement_threshold`
  - `max_additional_annotators_assignable`

## Edge Cases and Fallbacks

- If no predictions exist for `UNCERTAINTY`, fallback to uniform random.
- If all candidates are locked, no task is returned; the client should retry.
- If manual assignments exist and `assigned_flag` is set, the assigned-first path is used.

## Notes for Redesign

- The current flow is a blend of priority queues (manual, ground-truth, low-agreement, breadth-first), a conditional overlap-first sub-pipeline, and a configurable sampler. This can be modeled as a modular pipeline with pluggable stages for filtering, prioritization, and selection, governed by project policy and feature flags.



