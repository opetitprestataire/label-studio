# Scatter View – Implementation & Iteration Log

> This document captures the **architecture, API contract and the main debugging sessions** that led to the current implementation of the *Scatter View* feature inside Data-Manager.
>
> It should give future maintainers a single place to understand **how the point-cloud is rendered, how tasks are fetched, selected and handed over to Label Studio** and which pitfalls were already solved.

---

## 1. Backend endpoint

| Path | Method | Purpose | Pagination |
|------|--------|---------|------------|
| `/api/scatter/tasks` | GET | Returns *minimal* task representations suitable for the point-cloud (≈ `{id, data:{x,y,class,text,r}}`) | `page` / `page_size` (*1000* by default) |

Key details:
* **Database-agnostic** – removed Postgres-specific `KeyTextTransform` so the query runs on SQLite as well.
* Serializer explicitly converts numeric strings → numbers.
* Added `SCATTER_CACHE_TTL` constant & DRF pagination (1000-items).

> File references: `label_studio/scatter/api.py`, `serializers.py`, `constants.py`, `urls.py`.

---

## 2. Front-end stack

### 2.1 Components & hooks

```
ScatterView/            # UI + rendering
  ├─ ScatterView.tsx    # main deck.gl canvas
  ├─ ScatterSettings*   # toolbar & modal
  ├─ useScatterBaseData # progressive loading + cache
  ├─ useScatterSelection# click / brush selection logic
  └─ utils, tokens, …
```

* **Deck.gl layers** – separate `BASE`, `SELECTED`, `ACTIVE`, `HOVERED`, `SELECTION_BOX` layers for painter-order control.
* **Settings** – user can map any *string* field to the colour palette (default = `class`).
* **Reload button** – forces refetch of base points (`IconRefresh`).
* **Progressive loading** – hook fetches points per-page, keeps an in-memory cache keyed by `{projectId, classField}` to avoid the 40 k→0→40 k reload when switching views.
* **Selection** – `useScatterSelection` supports:
  * Plain click → active point
  * `Ctrl/Cmd` click → toggle select
  * `Shift` drag rectangle (with `Alt` modifier for *deselect* only)

### 2.2 State handshake with Data-Manager

* Each tab of type `scatter` owns a *view-specific MST model* (`view.scatter`) holding `activePointId`.
* ScatterView **never mutates MST state directly**; it calls callbacks provided by the view → stores decide what to do.

---

## 3. Interaction with Label Studio (editor)

During debugging we traced the full path:
1. Click in Scatter View → `activePointId` changes.
2. Effect in `ScatterView.tsx` decides:
   * **Heavy path** (first click / not in labeling mode): `root.startLabeling(task,{pushState:false})` → switches DM into labeling mode, mounts `<Labeling/>` wrapper.
   * **Light path** (already labeling):
     * Marks task as selected via `taskStore.setSelected(task)`
     * Calls `root.SDK.startLabeling()` which tells existing `LSFWrapper` to switch task **without remounting**.

The light-vs-heavy logic fixed a nasty flash where the whole React tree was unmounted & recreated on every click.

Patch location: `ScatterView.tsx` lines ≈ 380-430.

---

## 4. Bug-fix timeline

1. **Type mismatches** – ensured IDs are numbers when passing to MST (`parseInt`).
2. Removed invalid write to computed `isSelected`.
3. Prevented infinite loop (`setSelected` → `startLabeling` → render …) by delegating selection solely to stores.
4. Implemented in-memory cache for base points (
   `useScatterBaseData`).
5. Added `types/common-jsx.d.ts` declaration to silence "*.jsx implicit any" errors.  File was moved under `types/` (per `tsconfig.typeRoots`).
6. Introduced light/heavy labeling paths (see §3) – eliminated point-click flicker.

---

## 5. Current status & TODOs

✅ Smooth point-cloud interaction with instant task swap 
✅ Caching prevents unnecessary network churn 
✅ Works with >40 k tasks (tested) 

🚧 Future ideas
* Virtualised tooltip list (for dense clusters) 
* Lasso selection (non-rectangular) 
* GPU filter by text or metadata

---

*Authored by: development session 2024-06-15* 