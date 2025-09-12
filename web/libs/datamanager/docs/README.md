# Data Manager (\`@humansignal/datamanager\`) – Architecture & Extension Guide

## Table of contents
1.  [What is Data Manager?](#what-is-data-manager)
2.  [High-level architecture](#high-level-architecture)
3.  [Directory layout](#directory-layout)
4.  [Core runtime flow](#core-runtime-flow)
5.  [State management (MobX-state-tree)](#state-management-mobx-state-tree)
6.  [React component tree](#react-component-tree)
7.  [View system (Table, Grid & more)](#view-system-table-grid--more)
8.  [Adding a new **Cloud of Points** view](#adding-a-new-cloud-of-points-view)
9.  [Coding conventions & best practices](#coding-conventions--best-practices)
10. [Further reading](#further-reading)

---

## What is Data Manager?
Data Manager (DM) is the data exploration & curation frontend used by Label Studio and the HumanSignal ecosystem.  It enables users to **list, filter, sort and preview tasks, annotations and predictions** in multiple visual representations (currently *Table* and *Grid*).  The library lives in `web/libs/datamanager` and is consumed by end-user apps via the `@humansignal/datamanager` npm package.

Key goals:
* Handle **large datasets** efficiently (virtualised scrolling, incremental loading).
* Allow **rich per-project customisation** (columns, filters, saved tabs, permissions).
* Provide a **pluggable view system** so that new representations – like a *cloud of points* similar to *TensorFlow Projector* – can be added with minimal friction.

---

## High-level architecture
```text
┌────────────────────────────────────────────────────────┐
│                      AppStore (root)                  │
│  – wraps global SDK, user & project context           │
│  – owns TabStore & DataStores                         │
└────────────────────────────────────────────────────────┘
               │
               │ provides MST models via <Provider store={appStore}>
               ▼
┌────────────────────────────────────────────────────────┐
│                React component tree                   │
│  DataManager → Toolbar / FiltersSidebar / MainView    │
│                ├─ MainView.DataView.Table             │
│                └─ MainView.GridView                   │
└────────────────────────────────────────────────────────┘
               ▲
               │ observes MobX-state-tree models         │
               │ dispatches actions back to stores       │
               ▼
┌────────────────────────────────────────────────────────┐
│             REST / SDK request layer                  │
│  Implemented in src/sdk/*                             │
└────────────────────────────────────────────────────────┘
```

* **MobX-state-tree (MST) models** live in `src/stores/**`.  They are the single source of truth.
* **React components** in `src/components/**` observe MST models via `mobx-react` `inject` HOC and `observer`.
* **SDK** (`src/sdk/**`) abstracts network I/O and external integrations.
* **Utils & hooks** provide small helpers (BEM classnames, hotkeys, feature flags, etc.).

>  An up-to-date *boxes-and-arrows* diagram can be found in [`docs/dm_architecture_diagram.pdf`](./dm_architecture_diagram.pdf).

---

## Directory layout
```
web/libs/datamanager
├─ src
│  ├─ components               # Pure UI & containers
│  │   ├─ DataManager          # Top-level wrapper
│  │   ├─ MainView             # View system (Table/Grid/…)
│  │   ├─ DataGroups           # Cell renderers per data-type
│  │   ├─ Common               # Generic shared widgets (Table, Button, …)
│  │   └─ …
│  ├─ stores                   # MobX-state-tree models
│  │   ├─ AppStore.js          # Root store, entry point
│  │   ├─ Tabs/                # Saved views (filters, columns, ordering)
│  │   ├─ DataStores/          # Data entities (tasks, annotations, …)
│  │   └─ …
│  ├─ sdk                      # Network / external SDK facades
│  ├─ hooks                    # React hooks (hotkeys, …)
│  ├─ mixins, utils, types     # Support code
│  └─ index.js                 # Package entry re-export
├─ docs                        # You are here 📚
└─ …
```

---

## Core runtime flow
1. **App boot** – The embedding application instantiates `AppStore`, passing an SDK instance & project metadata.
2. **React render** – `DataManager` component is rendered inside `<Provider store={appStore}>`, gaining access to MST stores.
3. **Tab selection** – `TabStore` decides which *view* is active (table, grid, etc.) based on URL or local-storage.
4. **Data fetch** – The active view triggers `DataStore.fetch()` which calls `SDK.apiCall("tasks", …)`.
5. **Virtualised render** – `MainView/DataView` chooses the concrete visual component (**Table** or **GridView**) depending on `currentView.type` and renders only the visible subset (powered by `react-window`).
6. **User interaction** – Actions (sorting, selection, scrolling) dispatch MST actions which mutate observable state; React updates automatically.

---

## State management (MobX-state-tree)
### Important models
| Model | Location | Responsibility |
|-------|----------|----------------|
| `AppStore` | `src/stores/AppStore.js` | Root of the tree; holds `project`, `SDK`, and all sub-stores. |
| `TabStore` | `src/stores/Tabs/store.js` | All saved & virtual tabs (views). Handles creation, deletion, ordering, sidebar state. |
| `Tab` | `src/stores/Tabs/tab.js` | One specific saved view. Stores column config, filters, sorting, selection, etc. |
| `TasksStore` | `src/stores/DataStores/tasks.js` | Paginated tasks list; handles incremental loading & focusing. |
| `AnnotationStore`, `PredictionStore` | Idem for other entities. |

### Communication patterns
* Stores **never import React** – logic is framework-agnostic.
* Async actions use `flow()` generators (`yield` network requests).
* Global events (e.g. `tabChanged`) are propagated to the host application via `SDK.invoke()` – making Data Manager embeddable.

---

## React component tree
```
<DataManager>
 ├─ <TabsSwitch>           # Top bar with draggable tabs
 ├─ <Toolbar>              # Actions (import, export, bulk operations)
 ├─ <DataView>             # Wrapper that chooses concrete view
 │    ├─ <Table>           # List/ spreadsheet-style
 │    └─ <GridView>        # Masonry of thumbnails
 └─ <FiltersSidebar>       # Collapsible filter builder
```

Helper layers:
* **CellViews** (`src/components/CellViews`) – Data type → cell renderer mapping for `Table`.
* **DataGroups** (`src/components/DataGroups`) – Data type → card/thumbnail renderer for `GridView`.
* **Common/** – UI primitives: `Button`, `Icon`, `Space`, `Spinner`, `Table` (generic), etc.

---

## View system (Table, Grid & more)
Views are not hard-coded; they are **described by data**:
* `Tab.type` – string enum: `"list"` → `Table`, `"grid"` → `GridView` (see `src/components/MainView/index.js`).
* `Tab.fields` – which columns to show & their display type.

`MainView/DataView/Table.jsx` illustrates how additional view types can be routed:
```javascript
const content =
  view.type === "list" ? (
    <Table … />
  ) : (
    <GridView … />
  );
```

Therefore adding a new view only requires:
1. Implement a **React component** that conforms to the interface expected by `DataView` (see below).
2. Extend the **router** inside `DataView` to pick your component when `view.type === "cloud"`.
3. Provide **configuration UI** (optional) so users can switch to the new type (update tab-creation menu or toolbar).

---

## Adding a new **Cloud of Points** view
The goal is to replicate a *scatter-plot / projector* allowing users to navigate tasks by embedding coordinates.

### 1. Data requirements
Each task must expose at least two numeric features (`x`, `y`) – often produced by dimensionality reduction (t-SNE, UMAP, PCA). These coordinates are the foundation of your cloud view.

**How to get the data:**
* **Preferred:** Embed `x`, `y` (and optionally `z`, `color_label`, etc.) directly within the `task.data` JSON object. The `TasksStore` will fetch this as part of the standard task data. Your `CloudView` component will receive these via the `data` prop, which is an array of task objects.
  ```json
  // Example task.data
  {
    "image": "/path/to/img.jpg",
    "embedding_x": 0.123,
    "embedding_y": -0.456
  }
  ```
* **Alternative:** If coordinates are computed/stored separately, you might need to:
    * Augment the `TasksStore.fetch` logic or add a new method to fetch projection data alongside tasks.
    * Store this projection data within the `TaskModel` or a parallel structure.
    *(This approach is more complex and requires modifying the core stores.)*

### 2. Component skeleton
Create `src/components/MainView/CloudView/CloudView.jsx`:
```javascript
import { observer } from "mobx-react";
import { Block } from "../../utils/bem";
import { ScatterCanvas } from "./scatter/ScatterCanvas"; // your own virtualised WebGL canvas

export const CloudView = observer(({ data, view, loadMore, onChange, hiddenFields }) => {
  // 1. fetch / derive x,y 2. handle selection 3. call loadMore when nearing bounds
  return (
    <Block name="cloud-view">
      <ScatterCanvas
        points={data.map(task => ({ id: task.id, x: task.x, y: task.y }))}
        onPointClick={(id) => onChange?.(id)}
        onViewportChange={({ nearEdge }) => nearEdge && loadMore?.()}
      />
    </Block>
  );
});
```
* **Data Mapping:** Inside `CloudView`, map the incoming `data` prop (array of tasks) to the format expected by your canvas library, extracting the `x`, `y` fields (e.g., `task.data.embedding_x`).
* **WebGL / Canvas Choice:** Consider libraries like [PixiJS](https://pixijs.com/) for 2D or [regl](http://regl.party/) / [three.js](https://threejs.org/) for 3D. Evaluate based on performance needs and existing project dependencies.
* **Selection Synchronization:** Use the `onChange` prop (passed down from `DataView`) to report point selections back to the central state. It likely connects to `view.toggleSelected(taskId)`. Ensure your canvas library provides click/selection events that return the associated task ID.
* **Virtualization/Performance:** For large datasets (>10k points), your canvas implementation must be virtualized (only rendering visible points) or use performant WebGL techniques (instancing, appropriate buffer usage). `react-window` is not directly applicable to canvas, so you'll need a canvas-specific solution.
* **Loading Indicator:** Use the `isLoading` prop (passed from `DataView`) to show a loading state within the canvas area while `loadMore` is executing.

### 3. Routing in DataView
Modify `src/components/MainView/DataView/Table.jsx` (this file acts as the main view router currently, consider refactoring to a dedicated `src/components/MainView/ViewRouter.jsx` for clarity):
```javascript
import { CloudView } from "../CloudView/CloudView";
// …
const content =
  view.type === "list"  ? <Table … />
: view.type === "grid"  ? <GridView … />
: /* cloud */             <CloudView … />;
```

### 4. Tab metadata
In `src/stores/Tabs/tab.js` extend the `type` enum default & serialization so users can save a *cloud* tab.

### 5. UI entry point
Add a *"Cloud"* option to the *Add view* menu (Toolbar or Tab creation modal).  When selected, create a tab snapshot with `type: "cloud"`.

### 6. Selection & keyboard shortcuts
* **Mouse Interaction:** Implement point clicking (calls `onChange` -> `view.toggleSelected`) and potentially brush/lasso selection (calls `view.setSelected(arrayOfTaskIds)`).
* **Keyboard:** If appropriate, adapt existing shortcuts (`dm.focus-next`/`dm.focus-previous` might not make sense spatially, but `dm.open-labeling` for the selected point should work). Define new shortcuts in `src/sdk/hotkeys` if needed.

### 7. Filtering and Sorting
* **Filtering:** When filters are applied via the `FiltersSidebar`, the `data` prop passed to `CloudView` will automatically contain only the filtered tasks. Your canvas should re-render with the updated `data`.
* **Sorting:** Sorting (`Tab.ordering`) primarily affects the *order* in the `data` array. This might not have a direct visual impact on a scatter plot unless you specifically use the order for something (like animation or rendering sequence). Generally, the cloud view ignores the explicit sorting order.

### 8. Optional features
* Brushing / rectangular selection → `view.setSelected(ids)`.
* Color by label / prediction.
* 3-D mode (z-coordinate) – using another view variant.

>  Because Data Manager keeps most logic in stores, implementing a new view is mainly **pure UI work**.  No changes to backend APIs are necessary if you already have `(x, y)` per task.


### HOW startLabeling() PROPAGATES FROM Table.jsx  →  Task selection →  LabelStudio

╭──────────────────────────────────────────────────────────────────────────────╮
│ 1.  ENTRY POINT  –  Table.jsx                                               │
╰──────────────────────────────────────────────────────────────────────────────╯
When the user clicks a row (or presses shortcuts) in the data-table, Table.jsx
invokes:

  getRoot(view).startLabeling(item);        // 124, 321, 329  ‑- Table.jsx
  //               ↑      ↑
  //               │      └─ «item» is either a Task or an Annotation snapshot
  //               └───────── MST root (the AppStore instance)

This call jumps straight into AppStore.startLabeling().

╭──────────────────────────────────────────────────────────────────────────────╮
│ 2.  AppStore.startLabeling()                                                │
╰──────────────────────────────────────────────────────────────────────────────╯
File excerpt:                                                         
```350:430:web/libs/datamanager/src/stores/AppStore.js
      const nextAction = () => {
        self.SDK.setMode("labeling");   // switch DM into “labeling” mode

        if (item?.id && !item.isSelected) {
          const labelingParams = { pushState: options?.pushState };

          // Row can represent either an Annotation (has task_id) or a Task
          if (isDefined(item.task_id)) {
            labelingParams.annotationID = item.id;
            labelingParams.taskID       = item.task_id;
          } else {
            labelingParams.taskID       = item.id;
          }
          self.setTask(labelingParams); // (see section 3)
        } else {
          self.closeLabeling();         // toggle-off if clicked again
        }
      };
```
Safeguards:
• Confirms that labeling is configured, no task is currently being loaded,
  and (feature-flag) no unsaved LSF comment exists (opens a modal otherwise).

╭──────────────────────────────────────────────────────────────────────────────╮
│ 3.  AppStore.setTask()  – picks / loads the task and syncs URL              │
╰──────────────────────────────────────────────────────────────────────────────╯
```180:259:web/libs/datamanager/src/stores/AppStore.js
setTask: flow(function* ({ taskID, annotationID, pushState }) {
  // 3-A URL state
  if (pushState !== false) {
    History.navigate({ task: taskID, annotation: annotationID ?? null, ... });
  }

  // 3-B Load / select in MST stores
  if (annotationID !== undefined)
       self.annotationStore.setSelected(annotationID);
  else self.taskStore.setSelected(taskID);

  // 3-C Ensure full task JSON is present
  const taskPromise = self.taskStore.loadTask(taskID, {
                      select: !!taskID && !!annotationID });
  ...
  yield taskPromise.then(async () => {         // wait for REST call
      /* after task is in store & LSF exists */
      self.LSF?.setLSFTask(self.taskStore.selected, currentAnnotationID);
  });
});
```

Important details:

• taskStore is an MST model defined in `DataStores/tasks.js`  
  – Internally it’s a generic DataStore mixin that holds:
    - `list` (array of Task models)  
    - `selectedId` / `highlightedId` (primitives)  
    - helpers like `setSelected()`, `loadTask()`, `focusPrev/Next()`, etc.

• `loadTask()` fetches `/api/tasks/<id>` if not already cached, merges the
  payload into the list, sets loading flags, and finally returns the Task
  instance. (See lines 150-181 in tasks.js.)

╭──────────────────────────────────────────────────────────────────────────────╮
│ 4.  taskStore.setSelected()                                                 │
╰──────────────────────────────────────────────────────────────────────────────╯
```53:73:web/libs/datamanager/src/mixins/DataStore/DataStore.js
setSelected(val) {
  let selected = typeof val === "number"
      ? self.list.find(t => t.id === val) ?? getRoot(self).taskStore.loadTask(val)
      : val;

  if (selected && selected.id !== self.selected?.id) {
    self.selected = selected;           // writes selectedId primitive
    self.highlighted = selected;
    getRoot(self).SDK.invoke("taskSelected");
  }
}
```
Thus the chosen Task becomes `taskStore.selected`, accessible anywhere via
`getRoot(..).taskStore.selected`.

╭──────────────────────────────────────────────────────────────────────────────╮
│ 5.  Hand-off to the Editor (Label Studio Front-end)                         │
╰──────────────────────────────────────────────────────────────────────────────╯
After the task JSON is fully loaded, `setTask()` calls:

  self.LSF?.setLSFTask(task, annotationID);

`self.LSF` is an instance of `LSFWrapper` (sdk/lsf-sdk.js).  
During application bootstrap DM-SDK created it:

```410:web/libs/datamanager/src/sdk/dm-sdk.js
this.lsf = new LSFWrapper(this, element, { task, preload, isLabelStream });
```

Inside LSFWrapper:

```320:380:web/libs/datamanager/src/sdk/lsf-sdk.js
setLSFTask(task, annotationID, fromHistory, selectPrediction = false) {
  const lsfTask = taskToLSFormat(task);             // convert DM → LS schema
  ...
  this.lsf.assignTask(task);                        // sync meta
  this.lsf.initializeStore(lsfTask);                // feed JSON into LS core
  this.setAnnotation(annotationID, ...);            // choose annotation/pred.
}
```

Label Studio (embedded as `this.lsf.lsfInstance`) now displays the task,
pre-selects the proper annotation (or creates a new one), and the user can
start labeling.

╭──────────────────────────────────────────────────────────────────────────────╮
│ 6.  Summary Flow                                                            │
╰──────────────────────────────────────────────────────────────────────────────╯
1. Table row / shortcut → `AppStore.startLabeling(item)`  
2. Verifies prerequisites, switches DataManager mode to "labeling".  
3. Delegates to `setTask()` which  
   a) pushes URL state,  
   b) marks selection in `taskStore` / `annotationStore`,  
   c) fetches full task JSON via REST if needed.  
4. Once loaded, `LSFWrapper.setLSFTask()` is invoked to hand the data to the
   embedded Label Studio editor.  
5. Editor (lsfInstance) renders the task, ready for annotation.

All task objects therefore live in `taskStore.list`; the currently active one
is `taskStore.selected`.  Selection changes propagate to the UI and Label
Studio through MST reactions and the explicit `setLSFTask()` bridge.


---

## Coding conventions & best practices
* **React** – functional components + hooks only (see `docs/react` rule).
* **MobX-state-tree** – treat state like a database; keep side effects in `flow` actions.
* **Performance** – heavy views (grid/cloud) must use virtualisation or WebGL; never render thousands of DOM nodes.
* **Accessibility** – checkbox selection, keyboard shortcuts, focus management.
* **Testing** – write Jest/RTL tests in `__tests__/` next to the component.

---

## Further reading
* [`docs/api_reference.md`](./api_reference.md) – all SDK events & store actions.
* [`src/components/MainView/GridView/*`](../../src/components/MainView/GridView) – a complete example of an alternative view.
* [TensorFlow Embedding Projector](https://projector.tensorflow.org/) – UX inspiration.
* MobX-state-tree docs – <https://mobx-state-tree.js.org>.
* React-window docs – <https://react-window.vercel.app/>.

