import { observer } from "mobx-react";
import { useEffect, useState, useMemo, type FC, useCallback, useRef } from "react";
import { Block } from "../../../utils/bem";
import { getRoot } from "mobx-state-tree";

// Deck.gl imports
import DeckGL from "@deck.gl/react";
import { OrthographicView } from "@deck.gl/core";
import type { PickingInfo, ViewStateChangeParameters } from "@deck.gl/core";

import "./ScatterView.scss";

import type { TaskPoint, ScatterSettings } from "./utils/types";
import { ScatterSettingsButton } from "./ScatterSettingsButton";
import { useScatterSelection } from "./hooks/useScatterSelection";
import { useScatterFilteredIds } from "./hooks/useScatterFilteredIds";
import { TOOLTIP_STYLE } from "./utils/scatter-tokens";
import { IconCloseCircleOutline, IconRefresh } from "@humansignal/icons";
import { useScatterBaseData } from "./hooks/useScatterBaseData";
import { Button } from "@humansignal/ui";
import {
  useScatterLayers,
  useHoverLayer,
  useSelectionRectangleLayer,
  useCombinedLayers,
  type ScatterViewModel,
} from "./ScatterViewLayers";

/**
 * Interface for the root store, assuming it has a startLabeling method.
 * Replace with actual RootStore type if available.
 */
interface RootStoreWithLabeling {
  // Allow startLabeling to potentially accept just an ID
  startLabeling?: (itemOrId: TaskPoint | { id: string | number }, options?: { pushState?: boolean }) => void;
  closeLabeling?: () => void;
  // Access to the currently selected task ID (adjust path if needed)
  dataStore?: {
    selected?: {
      id: string | number;
    };
  };
  [key: string]: any;
}

/**
 * Props accepted by the ScatterView component.
 */
export interface ScatterViewProps {
  /** Array of task data objects. Expected to have `id` and `data.x`, `data.y`. */
  data: TaskPoint[];
  /** The MobX view model containing selection state and potentially root access. */
  view: ScatterViewModel;
  /** Callback invoked when a point is clicked, passing the task ID. */
  onChange?: (id: string) => void;
  /** Callback invoked when points are selected in bulk. */
  onBulkChange?: (ids: string[]) => void;
}

// Function to calculate bounding box [[minX, minY], [maxX, maxY]]
const calculateBounds = (points: TaskPoint[]): [[number, number], [number, number]] | null => {
  if (points.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY,
    minY = Number.POSITIVE_INFINITY,
    maxX = Number.NEGATIVE_INFINITY,
    maxY = Number.NEGATIVE_INFINITY;
  points.forEach((p) => {
    if (p.data.x < minX) minX = p.data.x;
    if (p.data.x > maxX) maxX = p.data.x;
    if (p.data.y < minY) minY = p.data.y;
    if (p.data.y > maxY) maxY = p.data.y;
  });
  // Add slight padding if min/max are the same
  if (minX === maxX) {
    minX -= 0.5;
    maxX += 0.5;
  }
  if (minY === maxY) {
    minY -= 0.5;
    maxY += 0.5;
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
};

/**
 * ScatterView component renders tasks as points using Deck.gl for high performance.
 *
 * Displays points based on `task.data.x` and `task.data.y`, supports hover,
 * click (single & shift+click for multi-select - TODO), pan/zoom interactions,
 * shows tooltips, and integrates with the labeling workflow.
 */
export const ScatterView: FC<ScatterViewProps> = observer(({ data = [], view, onChange, onBulkChange }) => {
  // Ensure scatter state exists for scatter views
  useEffect(() => {
    if (view.type === "scatter" && !view.scatter) {
      view.root.viewsStore.createScatterStateForView(view.id);
    }
  }, [view]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [initialViewState, setInitialViewState] = useState<any>(null);
  const [viewState, setViewState] = useState<any>(null); // Controlled view state
  const [deckKey, setDeckKey] = useState(0);

  // Add debounce timer ref for hover handling
  const hoverTimerRef = useRef<number | null>(null);

  // Settings state
  const [settings, setSettings] = useState<ScatterSettings>(() => {
    if (view.scatterSettings) {
      return {
        classField: view.scatterSettings.classField || "class",
      } as ScatterSettings;
    }
    return { classField: "class" };
  });

  // Extract available fields from data
  const availableFields = useMemo(() => {
    const fields = new Set<string>();
    data.forEach((item) => {
      if (item.data) {
        Object.keys(item.data).forEach((key) => {
          if (typeof item.data[key] === "string") {
            fields.add(key);
          }
        });
      }
    });
    return Array.from(fields);
  }, [data]);

  // Filter data for points with valid numeric coordinates & make safe copies of needed properties
  const numericPointsFiltered: TaskPoint[] = useMemo(() => {
    return data
      .filter((t) => t.data && typeof t.data.x === "number" && typeof t.data.y === "number")
      .map((t) => ({
        // Create a safe copy with just the properties we need
        id: t.id,
        data: {
          x: t.data.x,
          y: t.data.y,
          class: (t.data as any)[settings.classField] || "",
          text: t.data.text,
          time: t.data.time || 0,
          r: t.data.r,
        },
      }));
  }, [data, settings.classField]);

  // load base points via API
  const datamanager = (view as any)?.root?.SDK;
  const projectId = datamanager?.projectId;
  const { basePoints, loading: baseLoading, reload } = useScatterBaseData(projectId, settings, datamanager);

  const numericPoints: TaskPoint[] = useMemo(() => {
    return [...basePoints, ...numericPointsFiltered];
  }, [basePoints, numericPointsFiltered]);

  // Hook to keep filteredIds in sync with DM filters
  useScatterFilteredIds(view, { datamanager });

  const filteredVersion = view.scatter?.filteredVersion ?? 0;

  const filteredIdsSet = useMemo<Set<string>>(
    () => new Set((view.scatter?.filteredIds ?? []).map((id: number | string) => String(id))),
    [view.scatter?.filteredIds, filteredVersion],
  );

  // Increment deckKey whenever numericPoints identity changes
  useEffect(() => {
    setDeckKey((k) => k + 1);
  }, [numericPoints.length > 0]);

  // Get the active point ID from the view model
  const activePointIdFromView = view.scatter?.activePointId;

  // Use the refactored hook, passing state and setter from the view model
  const {
    onClick: handleClickUnified,
    onDragStart,
    onDrag,
    onDragEnd,
    // activeId is no longer returned by the hook
    selectionVersion,
    selectionRectangle,
  } = useScatterSelection({
    numericPoints,
    // Pass the current active ID from the view model
    activePointId: activePointIdFromView,
    // Pass the setter function from the view model
    // Ensure view.scatter exists before accessing setActivePointId
    // Update type annotation for id to number | null
    setActivePointId: useCallback((id: number | null) => view.scatter?.setActivePointId(id), [view.scatter]),
    // One point selection
    onToggleSelect: (id) => {
      onChange?.(id);
      console.log("onToggleSelect", id);
    },
    // Provide bulk selection to improve performance
    onBulkToggleSelect: (ids) => onBulkChange && onBulkChange?.(ids),
    isSelected: (id) => view.selected?.isSelected(id) ?? false,
    onClearSelection: () => view.clearSelection(),
  });

  // Effect to react to changes in the activePointId from the view model
  useEffect(() => {
    const root = getRoot<RootStoreWithLabeling>(view);
    const selectedInStore = root.dataStore?.selected?.id;
    const currentActiveId = view.scatter?.activePointId; // Get the latest value

    const timerId = setTimeout(() => {
      if (currentActiveId) {
        // Only start labeling if the active point is not already the selected one in the store
        // Compare potentially number with string/number from store - ensure consistent comparison or types
        if (String(selectedInStore) !== String(currentActiveId)) {
          const taskStoreAny = (root as any).taskStore;
          if (!taskStoreAny) return;

          const existingModel = taskStoreAny.list?.find?.((t: any) => t.id === currentActiveId);

          const performLabelingHeavy = (taskModel: any) => {
            // Heavy path – switches DM into labeling mode (used when not yet labeling)
            root?.startLabeling?.(taskModel, { pushState: false });
          };

          const performLabelingLight = (taskModel: any) => {
            // Light path – we are already in labeling mode, just update LSF selection
            try {
              // Mark the task selected in store without triggering full reloads
              if (typeof taskStoreAny.setSelected === "function") {
                taskStoreAny.setSelected(taskModel);
              }
              // Tell LSF to switch task
              root?.SDK?.startLabeling?.();
            } catch (err) {
              console.error(err);
              // fallback to heavy path
              performLabelingHeavy(taskModel);
            }
          };

          const isAlreadyLabeling = (root as any)?.isLabeling === true;

          const perform = isAlreadyLabeling ? performLabelingLight : performLabelingHeavy;

          if (existingModel) {
            perform(existingModel);
          } else if (typeof taskStoreAny.loadTask === "function") {
            taskStoreAny.loadTask(currentActiveId).then(perform).catch(console.error);
          }
        }
      } else {
        // If activeId became null in the view model and something was selected in the store, close labeling
        if (selectedInStore) {
          root?.closeLabeling?.();
        }
      }
    }, 0);

    // Cleanup the timeout if the effect re-runs or component unmounts
    return () => clearTimeout(timerId);

    // Depend on the active ID from the view model and the view itself (for root access)
  }, [activePointIdFromView, view]);

  // Create the different layer types
  const scatterLayers = useScatterLayers(
    numericPoints,
    activePointIdFromView != null ? String(activePointIdFromView) : null,
    view,
    settings,
    selectionVersion,
    filteredIdsSet,
    filteredVersion,
  );

  const selectionLayer = useSelectionRectangleLayer(selectionRectangle);

  const hoverLayer = useHoverLayer(numericPoints, hoveredId);

  // Combine layers for final rendering
  const layers = useCombinedLayers(scatterLayers, selectionLayer, hoverLayer);

  // Clean up WebGL context on unmount
  useEffect(() => {
    return () => {
      // Cleanup function
      setViewState(null);
      setInitialViewState(null);
    };
  }, []);

  // Calculate initial view state ONLY when numericPoints first becomes non-empty
  useEffect(() => {
    // Only proceed if initial state is null AND we now have points
    if (!initialViewState && numericPoints.length > 0) {
      const bounds = calculateBounds(numericPoints);
      if (bounds) {
        const [[minX, minY], [maxX, maxY]] = bounds;
        const minZoomAllowed = 4;
        const maxZoomAllowed = 100;
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        // Compute a zoom level that fits the points within ~500px viewport
        let computedZoom = Math.log2(Math.min(500 / rangeX, 500 / rangeY)) - 1;
        // Clamp zoom to avoid values outside of allowed range which may trigger deck.gl assertions
        computedZoom = Math.max(Math.min(computedZoom, maxZoomAllowed), minZoomAllowed);

        const initialVs = {
          target: [(minX + maxX) / 2, (minY + maxY) / 2, 0],
          zoom: computedZoom,
          minZoom: minZoomAllowed,
          maxZoom: maxZoomAllowed,
        };
        setInitialViewState(initialVs);
        setViewState(initialVs); // Set controlled state at the same time
      }
    }
    // Dependency ensures this runs only when points appear or initial state is reset elsewhere
  }, [numericPoints.length > 0, initialViewState]);

  // Effect: if numericPoints becomes empty, reset initial view so DeckGL unmounts
  useEffect(() => {
    if (numericPoints.length === 0 && initialViewState) {
      setInitialViewState(null);
      setViewState(null);
    }
  }, [numericPoints.length, initialViewState]);

  // Tooltip Content - Keep this optimized and simple
  const getTooltip = useCallback((info: PickingInfo) => {
    const object = info.object as TaskPoint | undefined;
    if (!object) return null;
    return {
      text: `${object.data.text || `Task ${object.id}`}\nClass: ${object.data.class || "N/A"}`,
      style: TOOLTIP_STYLE,
    };
  }, []);

  // Hover Handler - Debounce hover events to reduce state updates
  const handleHover = useCallback((info: PickingInfo) => {
    const newHoveredId = info.object ? (info.object as TaskPoint).id : null;

    // Clear any existing timer
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    // Set a small debounce delay to avoid excessive hover updates
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredId(newHoveredId);
      hoverTimerRef.current = null;
    }, 5); // 5ms debounce
  }, []);

  // Clean up the hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  // View State Change Handler
  const handleViewStateChange = useCallback(({ viewState: newViewState }: ViewStateChangeParameters) => {
    setViewState(newViewState);
  }, []);

  // Persist settings changes coming from the toolbar dialog.
  const handleSettingsChange = useCallback(
    (newSettings: ScatterSettings) => {
      setSettings(newSettings);
      view.setScatterSettings(newSettings);
    },
    [view],
  );

  // Render guard: need data and initialViewState
  if (numericPoints.length === 0) {
    return (
      <Block name="scatter-view" elem="no-data" mod={{ empty: true }}>
        <Block className="scatter-view__message">
          <IconCloseCircleOutline className="scatter-view__message-icon" />
          <h3>{data.length === 0 ? "No tasks found" : "No point coordinates available"}</h3>
          <p>
            {data.length === 0
              ? "There are no tasks to display in the scatter plot."
              : "Tasks exist but don't contain the necessary coordinates (x,y) in task data for visualization."}
          </p>
        </Block>
      </Block>
    );
  }

  if (!initialViewState) {
    return (
      <Block name="scatter-view" elem="no-data">
        Calculating view...
      </Block>
    );
  }

  return (
    <Block name="scatter-view">
      {/* Settings button */}
      <Block name="scatter-view-toolbar">
        <ScatterSettingsButton
          settings={settings}
          onSettingsChange={handleSettingsChange}
          availableFields={availableFields}
        />
        <Button leading={<IconRefresh />} onClick={reload} waiting={baseLoading} size="small" />
      </Block>

      <DeckGL
        key={`s catter-${deckKey}`}
        layers={layers}
        views={new OrthographicView({ id: "ortho-view" })}
        initialViewState={initialViewState}
        onViewStateChange={handleViewStateChange}
        controller
        getTooltip={getTooltip}
        onClick={handleClickUnified}
        onHover={handleHover}
        onDragStart={onDragStart as any}
        onDrag={onDrag as any}
        onDragEnd={onDragEnd as any}
        style={{ position: "relative", width: "100%", height: "100%" }}
      />
    </Block>
  );
});
