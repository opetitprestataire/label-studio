# ScatterView Enhancements: Implementation Plan (Updated)

This document outlines the plan for enhancing the `ScatterView` component, focusing on advanced selection mechanisms and improved rendering architecture based on recent development iterations.

## 1. Backend APIs (No Change from Initial Plan)

*   **`GET /api/dm/scatter/tasks`**
    *   **Purpose:** Fetch *all* task points required for the base layer, potentially optimized for scatter plot visualization (only necessary fields).
    *   **Params:** `project=<id>` (required), `fields=x,y,class,r,time,...` (configurable)
    *   **Response:** `[{ id, x, y, class, r, time, ... }, ...]`
*   **`POST /api/dm/scatter/filtered-ids`**
    *   **Purpose:** Get IDs of tasks matching current Data Manager filters without pagination limits.
    *   **Body:** `{ project, filters, ordering }` (standard DM filter schema)
    *   **Response:** `{ ids: [Number, ...] }`
*   **Rationale:** These APIs are needed to handle potentially large datasets efficiently, separating the "all points" view from the filtered/paginated view used by other DM components. *Implementation deferred.*

## 2. Frontend State Management (Revised Approach)

*   **Initial Plan:** Dedicated `ScatterRootStore` using MobX-state-tree.
*   **Current Implementation:** Leverages existing MobX state passed via props from the parent `view` model (`view.selected`, `view.clearSelection`, `onChange` callback connected to `view.toggleSelected`).
*   **Plan:** Continue using the prop-based approach for selection state synchronization with the main Data Manager. The `useScatterSelection` hook manages *local* UI state (like `selectionRectangle`) and coordinates calls to the parent MobX actions via props. A dedicated store might be revisited if complexity increases significantly.

*   **Dedicated Scatter State in Tab Model:** To manage runtime state specific to the scatter view (that needs to persist across component remounts within the same tab session) and separate it from persistent user settings, the following approach was implemented within the main `Tab` model (`stores/Tabs/tab.js`):
    *   **`scatter: types.maybe(ScatterState)`**: Holds **runtime state** related to the *current interaction* (initially `activePointId`, potentially `zoom`, `target` coordinates in the future). Uses a dedicated `ScatterState` MST model. This state is initialized for scatter-type tabs via `afterCreate` and a defensive action in `TabStore`.
    *   **`scatterSettings: types.maybeNull(CustomJSON)`**: Holds **user-configurable, persistent settings** (e.g., the field used for color-coding points, axes configuration). This state *is* saved with the tab configuration using simple JSON.
    *   **Rationale:** This separation clearly distinguishes temporary interaction state from saved user preferences, improving organization and maintainability.

## 3. Rendering Architecture: Multi-Layer Painter's Algorithm (Revised Approach)

*   **Initial Plan:** Single `ScatterplotLayer` with complex accessors OR Z-depth sorting.
*   **Chosen Approach:** Multiple distinct Deck.gl layers rendered using the painter's algorithm (`depthTest: false`). This guarantees correct visual stacking regardless of point density or WebGL precision issues.
*   **Layers (Draw Order: Bottom to Top):**
    1.  **Base Layer (`LAYER_ID.BASE`):** `ScatterplotLayer` for all points *not* in selected, active, or hovered states. Uses `CATEGORY_COLORS` based on `settings.classField`.
    2.  **Selected Layer (`LAYER_ID.SELECTED`):** `ScatterplotLayer` for points selected via interactions, *excluding* the active point. Uses `STROKE.selected` color.
    3.  **Active Layer (`LAYER_ID.ACTIVE`):** `ScatterplotLayer` for the single active point (if any). Uses `STROKE.active` color and larger radius delta.
    4.  **Hovered Layer (`LAYER_ID.HOVERED`):** `ScatterplotLayer` for the point currently under the cursor (if any). Rendered topmost for maximum visibility. Uses `STROKE.hovered` color.
    5.  **Selection Box Layer (`LAYER_ID.SELECTION_BOX`):** `PolygonLayer` rendered *only* during Shift+Drag operations to visualize the selection area. Uses `SELECTION_RECT_*` colors.
*   **Implementation:**
    *   `useScatterLayers` hook encapsulates the logic for splitting `numericPoints` into data arrays for each layer and configuring the layer instances.
    *   Uses layer ID constants (`LAYER_ID`) for clarity.
    *   Visual styles (colors, radii, strokes) are sourced from `scatter-tokens.ts`.

## 4. Interaction Handling (Implemented)

*   **Hook:** `useScatterSelection` centralizes all interaction logic.
*   **Features:**
    *   `Ctrl + Click`: Toggle selection for a single point.
    *   `Shift + Drag`: Add points within the drawn rectangle to the selection. Visualized with `PolygonLayer`.
    *   `Shift + Alt + Drag`: Remove points within the drawn rectangle from the selection.
    *   `Click` (no modifier): Set the clicked point as the `activeId`, triggering the `onActiveChange` callback (which typically opens the labeling editor via `root.startLabeling`).
    *   `Esc Key`: Clear the current selection via the `onClearSelection` callback (wired to `view.clearSelection`).
    *   Hover: Update `hoveredId` state for visual feedback (handled directly in `ScatterView`).
*   **Event Handling:** Hook returns Deck.gl compatible event handlers (`onClick`, `onDragStart`, `onDrag`, `onDragEnd`) passed to the `<DeckGL>` component. Deferred execution (`setTimeout`) used for MobX actions to avoid Deck.gl event cycle conflicts.

## 5. Code Structure & Best Practices (Implemented)

*   **Hooks:**
    *   `useScatterSelection`: Manages interaction state and logic.
    *   `useScatterLayers`: Manages layer creation and configuration.
*   **Utilities (`utils.ts`):** Contains generic helpers (e.g., `PositionType`, color converters - though some were moved back).
*   **Tokens (`scatter-tokens.ts`):** Centralizes visual constants (colors, radii, opacities, stroke widths).
*   **Component (`ScatterView.tsx`):** Acts as the main orchestrator, integrating hooks, handling MobX connections via props, and rendering the `<DeckGL>` container.
*   **Type Safety:** Uses TypeScript interfaces (`TaskPoint`, `ScatterViewModel`, etc.) and explicit types where possible. Some `as any` casts remain for Deck.gl parameters where types are complex or potentially mismatched.

## 6. Roll-out Checklist (Updated)

*   [ ] BE API endpoints & tests (`/scatter/tasks`, `/scatter/filtered-ids`)
*   [ ] MST ScatterStore + unit tests (*Deferred - using prop-based state*)
*   [x] ScatterView refactor with multi-layered rendering (`useScatterLayers`)
*   [x] Interaction handlers (`useScatterSelection`): ctrl-click, shift-drag, shift-alt-drag, esc-clear, plain click activation
*   [x] Selection rectangle visualization (`PolygonLayer`)
*   [x] Styling moved to `scatter-tokens.ts`
*   [x] Utilities refactored (`utils.ts`, `useScatterSelection.ts`)
*   [ ] Settings dialog updates (e.g., for radius/time fields - *Future Work*)
*   [ ] Storybook stories for different data/interaction scenarios
*   [ ] E2E Cypress test: filter -> selection -> open editor

## 7. Active Point State Management (Refactoring Summary)

*   **Problem:** Initially, the active point state (`activeId`) was managed locally within the `useScatterSelection` hook. Triggering labeling (`root.startLabeling`) caused component remounts, losing this local state.
*   **Solution:** The `activePointId` state was moved into the `ScatterState` model, stored under the `view.scatter` field in the main `Tab` model. This ensures the state persists across remounts within the same tab session.
*   **Implementation Details:**
    *   The `Tab` model was updated with the `scatter: types.maybe(ScatterState)` field (see Section 2 for details on `scatter` vs `scatterSettings`).
    *   The `useScatterSelection` hook now receives `activePointId` and `setActivePointId` via props, interacting directly with the `view.scatter` state.
    *   `ScatterView` uses a `useEffect` to react to `view.scatter.activePointId` changes for triggering labeling.
    *   Type consistency for the ID (`number`) was ensured.
*   **Outcome:** This refactoring makes the active point state resilient to component remounts and centralizes view-specific runtime state within the `Tab` model's `scatter` property.


## Scatter API – Backend Implementation PLAN

Goal
----
Expose `GET /api/scatter/tasks` that returns **up to 1 000 tasks per page**
containing only the **coordinates & meta‐fields** requested by the frontend.
Security and permissions **must match TaskListAPI** semantics.

Typical request
---------------
GET /api/scatter/tasks?project=42
    &x=embedding_x&y=embedding_y          # ← mandatory
    &class=category&text=title&r=radius   # ← optional
    &image=image&time=created_at
    &page=2                               # ← standard DRF pagination

Typical response
----------------
HTTP 200
{
  "total": 32750,
  "page_size": 1000,
  "page": 2,
  "tasks": [
    {
      "id": 1001,
      "x": 0.123,
      "y": -0.456,
      "class": "dog",
      "text": "A running dog",
      "r": 5.7,
      "image": "/data/dog.jpg",
      "time": "2024-05-23T14:17:09Z"
    },
    …
  ]
}

High-level steps
----------------
1.  **URLs**
    • `label_studio/scatter/urls.py`
        `path("tasks", ScatterTasksAPI.as_view(), name="scatter-tasks")`
    • included from project-level `urls.py` under `/api/scatter/`

2.  **Pagination**
    ```python
    class ScatterPagination(PageNumberPagination):
        page_size = 1000
        page_size_query_param = "page_size"   # allow overriding in tests
        max_page_size = 5000                  # safeguard
    ```

3.  **Serializer**
    Dynamic – because fields are dictated by query-params.
    ```python
    class ScatterTaskSerializer(serializers.BaseSerializer):
        def to_representation(self, obj):
            qp  = self.context["requested"]
            rep = {"id": obj.id}
            for api_name, json_key in qp.items():
                # obj.<direct_field>  (time, completed_at, …)
                if hasattr(obj, json_key):
                    rep[api_name] = getattr(obj, json_key)
                # obj.data["json_key"]  (x,y,class,text, …)
                else:
                    rep[api_name] = obj.data.get(json_key)
            return rep
    ```
    • Context `requested = {"x": "embedding_x", …}` is prepared in the view.

4.  **Permissions / Queryset**
    • Reuse `ViewClassPermission` with GET = `all_permissions.tasks_view`.
    • Look up `project` query param and run
      ```python
      queryset = (
          Task.objects.for_user(request.user)
          .filter(project_id=project_id)
          .only("id", "data", *direct_db_fields)   # performance
      )
      ```
    • No filters for v0 (will be added later).

5.  **Field Extraction Optimisations (PostgreSQL)**
    • For JSON fields (`data→'embedding_x'` etc.) use `KeyTextTransform`
      so we SELECT the values server-side instead of Python loops:

      ```python
      from django.contrib.postgres.fields.jsonb import KeyTextTransform
      annotations = {}
      for api_name, json_key in json_fields.items():
          annotations[api_name] = Cast(KeyTextTransform(json_key, "data"), FloatField())
      queryset = queryset.annotate(**annotations)
      ```

    • “Direct” DB columns (e.g. `created_at`) are included via `.values()`.

    • Final queryset becomes `.values("id", *api_param_names)` – small payload.

6.  **View**
    ```python
    class ScatterTasksAPI(generics.ListAPIView):
        permission_required = ViewClassPermission(GET=all_permissions.tasks_view)
        pagination_class    = ScatterPagination
        serializer_class    = ScatterTaskSerializer

        def get_queryset(self):
            self.project = get_object_or_404(Project, pk=self._project_id())
            self.check_object_permissions(self.request, self.project)

            qp           = self._fields_map()        # {"x":"emb_x", …}
            direct_cols  = [v for v in qp.values() if v in DIRECT_DB_FIELDS]
            json_cols    = {k:v for k,v in qp.items() if v not in direct_cols}

            qs = (Task.objects.filter(project=self.project)
                  .only("id", *direct_cols, "data")
                  .annotate(**self._json_annotations(json_cols)))
            return qs

        def list(self, request, *args, **kwargs):
            self.requested = self._fields_map()      # save for serializer
            return super().list(request, *args, **kwargs)

        def get_serializer_context(self):
            ctx = super().get_serializer_context()
            ctx["requested"] = self.requested
            return ctx
    ```
    Helper methods: `_project_id`, `_fields_map`, `_json_annotations`.

    • Mandatory params check: raise `400` if `x` or `y` missing.
    • Allowed param names whitelisted: `{"x","y","class","text","r","image","time"}`.

7.  **Tests**
    • Unit tests for:
        – Missing `x`/`y` → 400  
        – Pagination size 1000  
        – Permissions (user without access → 403)  
        – JSON & direct field mixture extraction.


Incremental rollout
-------------------
1. Merge skeleton (URLs + empty view) – CI passes.
2. Implement field extraction & pagination.
3. Add tests
4. Future: reuse Data Manager filter serializer → adjust `get_queryset`.

Dependencies / Notes
--------------------
• The plan assumes **PostgreSQL**; if MySQL is used, JSON annotations change.  
• Image URIs: for v0 we return the raw value stored in `task.data[image_key]`
  (front-end already handles `resolve_uri`).  
• `DIRECT_DB_FIELDS = {"created_at", …}` constant lives in `scatter/constants.py`.  
• Performance: 1 000 × ( ~120 B row ) ≈ 120 kB → fits comfortably in payload.