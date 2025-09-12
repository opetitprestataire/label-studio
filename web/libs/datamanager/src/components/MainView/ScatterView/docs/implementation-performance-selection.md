Here’s a high-level recap of everything we addressed in this session:

1. Performance fixes in `ScatterView.tsx`  
   - Pulled all heavy, multi-point layer logic into a dedicated hook (`useScatterLayers`), removing `selectionRectangle` and `hoveredId` from its dependency array so it only reruns when the data or selection truly changes.  
   - Isolated the rectangle brush into its own hook (`useSelectionRectangleLayer`) so drawing the selection box no longer rebuilds all of your point layers.  
   - Isolated hover rendering into `useHoverLayer` + debounced the hover handler (20 ms) to avoid firing hundreds of state updates per second.  
   - Leveraged Deck.gl’s `updateTriggers` on color/radius accessors to avoid unnecessary GPU buffer uploads.

2. Refactoring & folder structure  
   - Extracted layer-creation logic out of `ScatterView.tsx` into a new `ScatterViewLayers.tsx` file (renamed to PascalCase to match your component convention).  
   - Moved all React hooks (`useScatterSelection.ts`, `useScatterBaseData.ts`) into a `hooks/` subfolder.  
   - Centralized all constants & type definitions under `utils/` (e.g. `scatter-tokens.ts`, `types.ts`).  
   - Updated imports in `ScatterView.tsx` to use these new modules and removed all duplicated logic.

3. File naming  
   - Standardized to PascalCase for view-related modules (`ScatterView.tsx`, `ScatterViewLayers.tsx`, `ScatterSettingsButton.tsx`) and kebab-case for pure utilities and hooks (`use-scatter-selection.ts`, `utils/scatter-tokens.ts`).


