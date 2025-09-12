# ScatterView Component

## Overview

The `ScatterView` component provides a 2D scatter plot visualization for tasks within the Data Manager. Its primary purpose is to allow users to explore and interact with tasks that have associated numerical `x` and `y` coordinates, offering an alternative spatial perspective compared to the standard grid or list views. This is particularly useful for visualizing embeddings, spatial data, or any dataset where a 2D projection is meaningful.

## Goals

*   **High Performance:** Render large datasets (potentially 50k-100k+ points) smoothly.
*   **Interactivity:** Support standard plot interactions like panning, zooming, hovering (tooltips), and point selection.
*   **Labeling Integration:** Allow users to select points on the scatter plot to initiate the labeling workflow.
*   **Configurability:** Enable users to customize aspects like point coloring based on task data fields.
*   **Maintainability:** Utilize modern React and TypeScript best practices, leveraging a suitable visualization library.

## Implementation Details

### Technology Stack

*   **React:** The core UI library.
*   **TypeScript:** For type safety and improved developer experience.
*   **Deck.gl (`@deck.gl/react`, `@deck.gl/layers`, `@deck.gl/core`):** A high-performance WebGL-powered visualization library chosen for its ability to handle large datasets efficiently. We specifically use the `ScatterplotLayer` for rendering points.
*   **MobX (`mobx-react`, `mobx-state-tree`):** Used for state management, particularly for handling view state and task selection synchronization.

### Key Concepts

1.  **Data Format:** The component expects an array of `TaskPoint` objects (defined in `utils/types.ts`). Each task *must* have `data.x` and `data.y` properties containing numerical coordinates to be rendered. Optional fields like `data.class` (or others configured via settings) can be used for styling.
2.  **Rendering:** `DeckGL` from `@deck.gl/react` is the main container. The rendering logic is split into dedicated hooks located in `ScatterViewLayers.tsx`:
    * `useScatterLayers` – base, selected, and active points
    * `useHoverLayer` – single hovered point (updates frequently)
    * `useSelectionRectangleLayer` – temporary rectangle shown while `Shift`-dragging
3.  **View State:** Panning and zooming are handled by Deck.gl's built-in controller. The component maintains a controlled `viewState` and calculates an `initialViewState` to automatically frame the data upon loading.
4.  **Interactions:**
    *   **Hover:** `onHover` callback updates the `hoveredId` state, triggering visual feedback (point enlargement, outline changes) via layer accessors. Tooltips are displayed using `getTooltip`.
    *   **Click:** `onClick` callback handles point selection.
        *   It retrieves the clicked `TaskPoint`.
        *   It calls the `onChange` prop (if provided) to update the selection state in the parent MobX store.
        *   Crucially, it interacts with the root store (`getRoot(view)`) to either initiate labeling (`startLabeling`) for a new point or close the labeling interface (`closeLabeling`) if the currently selected/labeled point is clicked again. Logic is deferred slightly using `setTimeout` to ensure the event cycle completes.
        *   *TODO:* Shift+click for multi-selection is planned but not yet implemented.
5.  **Styling:**
    *   Point color is determined by the value of a configurable field (defaulting to `data.class`). A hashing function maps distinct string values to a predefined color palette (`palette`).
    *   Point radius and line width/color change based on hover and selection status (`view.selected?.isSelected(d.id)`).
    *   Basic CSS/SCSS is used for the container and toolbar (`ScatterView.scss`).
6.  **Configuration:** The `ScatterSettingsButton` and its associated modal allow users to select which task data field should be used for color-coding points (`settings.classField`).

### Evolution (Canvas to Deck.gl)

Initially, a custom implementation using the HTML Canvas API was developed. However, due to performance concerns with very large datasets and alignment with React best practices favoring declarative approaches, the component was refactored to use Deck.gl. This provides better performance, built-in interaction handling, and a more maintainable structure.

## Current State & Achievements

*   Successfully renders tasks as points based on `data.x` and `data.y`.
*   Uses Deck.gl (`ScatterplotLayer`) for rendering.
*   Supports panning and zooming.
*   Provides hover effects (point highlighting) and tooltips displaying basic task info.
*   Integrates with the labeling workflow via single point clicks (`startLabeling`, `closeLabeling`).
*   Points are color-coded based on a configurable string field (`data.class` by default) using a stable hashing approach.
*   Selection state is reflected visually (different outline/radius).
*   Includes a basic settings UI (`ScatterSettingsButton`) to change the color-coding field.
*   Handles cases where no data or no coordinate data is available.
*   Calculates an appropriate initial view state to fit the data.

## Settings Implementation

The ScatterView includes a configurable settings system that allows users to customize how data is visualized:

1. **Settings Dialog**: A modal dialog (`ScatterSettingsDialog`) that provides a form interface for configuring visualization parameters:
   - Currently supports selecting the data field to use for point classification/coloring
   - Uses direct DOM access via form refs to ensure reliable value capture on submit

2. **Settings Button**: A toolbar button (`ScatterSettingsButton`) that opens the settings dialog:
   - Appears in the top-right corner of the ScatterView
   - Uses the DataManager's common Button and Icon components for consistent styling

3. **Settings Persistence**:
   - Settings are stored in the DataManager Tab model using a `scatterSettings` field
   - Settings are serialized using MST's CustomJSON type and persisted to the backend
   - Settings are loaded when the view is initialized, providing a consistent experience across sessions

4. **Dynamic Color Mapping**:
   - Points are colored based on the selected class field (`settings.classField`)
   - A hash function maps field values to colors from a predefined palette
   - The `numericPoints` array is rebuilt when settings change to remap fields
   - The Deck.gl layer update triggers ensure colors update immediately when settings change
   
5. **Technical Challenges**:
   - React closure issues required careful handling of form values
   - Deck.gl update triggers needed precise configuration to avoid WebGL context errors
   - Tab model persistence required proper serialization/deserialization

This implementation allows for future expansion of the settings system to include additional visualization parameters such as point size, opacity, or different color palettes.

## Recent Enhancements

* **Multi-layer rendering** – Points are now split into dedicated
  `ScatterplotLayer`s (base, selected, active, hovered).  Painter's
  algorithm (`depthTest:false`) guarantees stacking order without depth-buffer
  artefacts.
* **Rectangle Selection UX** – `PolygonLayer` draws a semi-transparent
  orange rectangle while *Shift + dragging*; points inside are added to
  the selection (`Shift + Alt` removes).
* **Tokenised Styling** – All colours, stroke widths and radii are
  defined in `scatter-tokens.ts` (`CATEGORY_COLORS`, `STROKE`, `RADIUS`,
  `SELECTION_RECT_*`) for easy theming.
* **Utilities Extraction** – Geometry helpers now live in `utils/` and layer hooks have moved to `ScatterViewLayers.tsx` under the view folder.
* **Keyboard & Mouse Shortcuts**
  | Gesture                | Behaviour                              |
  |------------------------|----------------------------------------|
  | `Ctrl + Click`         | Toggle single-point selection          |
  | `Shift + Drag`         | Add points inside rectangle            |
  | `Shift + Alt + Drag`   | Remove points inside rectangle         |
  | `Esc`                  | Clear selection                        |

These changes improve clarity, maintainability and user feedback when
working with dense point clouds.

## Future Work & TODOs

*   Enhance the Settings UI with more options:
    - Allow selection of X/Y coordinates fields
    - Configure point size scaling
    - Adjust opacity and colors 
    - Enable animation based on time field
    - Add custom color mapping rules
*   Investigate performance optimizations for extreme scales (e.g., data aggregation, layer optimizations).
*   Consider adding other Deck.gl layers if needed (e.g., `TextLayer` for labels).
*   Refine tooltip content and styling.
*   Implement the `loadMore` functionality for infinite scrolling/pagination if required.

## Best Practices & Contribution Guide

*   **Follow Project Standards:** Adhere to the established React, TypeScript, and general coding standards outlined in the project's documentation (refer to `.mdc` rules if applicable).
*   **Declarative Approach:** Favor Deck.gl's declarative layer properties and updates over imperative manipulation. Use `updateTriggers` effectively when accessor dependencies change.
*   **Type Safety:** Maintain strong typing using TypeScript interfaces (`TaskPoint`, `ScatterViewProps`, etc.).
*   **Component Structure:** Keep the main `ScatterView.tsx` focused. Extract complex logic or reusable parts into hooks or utility functions where appropriate (e.g., `calculateBounds`, `hexToRgba`).
*   **State Management:** Leverage MobX for shared state (like selection) passed via props (`view`). Keep local UI state (like `hoveredId`, `viewState`) within the component using `useState`.
*   **Performance:** Be mindful of performance implications, especially within layer accessors which run frequently. Avoid unnecessary computations. Use `useMemo` and `useCallback` appropriately.
*   **Comments:** Add comments for non-obvious logic, especially around Deck.gl configurations, interaction handling, and state management integration.
*   **Testing:** Consider adding Storybook stories for different data scenarios and unit/integration tests for key interactions.



---------------------------------------------

# Task Point System and Its Layers & Selection

The ScatterView supports four distinct conceptual layers of points, each with its own visual representation and interaction pattern:

### Data Layers

1. **All Task Points**
   - Represents *all* tasks in the project (potentially millions)
   - Always visible as the base layer
   - Colored using the configurable palette based on classification field
   - Loaded via dedicated endpoint: \`GET /api/dm/scatter/tasks?project=<id>&fields=x,y,class,r,time\`

2. **Filtered Task Points**
   - Subset of tasks matching active Data Manager filters
   - Visible only when at least one filter is active
   - Rendered in ORANGE_DARK color
   - Updated whenever filters change via \`POST /api/dm/scatter/filtered-ids\` 
   - Uses same filter logic as main Data Manager views

3. **Selected Task Points**
   - Manually selected by user interactions
   - Rendered in ORANGE color
   - Synchronized with Data Manager's task selection system
   - Supports both individual and rectangular selection

4. **Active Point**
   - Single point with open editor/labeling interface
   - Rendered in RED color
   - Corresponds to current task being labeled

### User Interactions

- **CTRL + Click**: Toggle selection state for individual point
- **SHIFT + Drag**: Select all points within rectangular area
- **Click** (no modifier): Set point as active and open editor

### Technical Implementation

#### Backend APIs

- \`GET /api/dm/scatter/tasks\`: Returns lightweight task data for all points
  - Query params: \`project\` (required), \`fields\` (configurable list of attributes)
  - Response format: Array of \`{id, x, y, class, r, time}\` objects
  
- \`POST /api/dm/scatter/filtered-ids\`: Returns IDs of tasks matching filters
  - Request body: \`{project, filters, ordering}\` (same schema as Task API)
  - Response: \`{ids: [1, 42, 99, ...]}\`

#### Frontend Store (MobX-state-tree)

\`\`\`
ScatterRootStore
  ├─ allPoints        : Map<ID, Point>
  ├─ filteredIds      : Set<ID>
  ├─ selectedIds      : Set<ID>
  ├─ activeId         : number | null
  └─ ui               : { isLoading, error, ... }
\`\`\`

### Performance Considerations

- Backend streams results in chunks for large datasets (NDJSON, gzip)
- Minimal re-renders using appropriate \`updateTriggers\` for each layer
- Efficient point filtering using Set lookups rather than array iterations
- WebGL instancing ensures optimal GPU utilization

### Settings Integration

ScatterSettingsDialog will be extended with:
- Class field selector (determines point coloring)
- Radius field selector (optional)
- Time field selector (for future temporal analysis)

Settings are persisted in Tab.scatterSettings and affect both visualization and API requests.