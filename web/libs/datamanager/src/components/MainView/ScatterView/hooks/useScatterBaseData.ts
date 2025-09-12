/**
 * Progressive loading hook for Scatter plot base points
 *
 * This hook manages fetching ALL task points for the scatter plot's base layer,
 * handling pagination, loading state, cancellation, and component lifecycle.
 *
 * Design goals:
 * - Incremental/streaming updates: UI updates as each page arrives
 * - Clean cancellation: Aborts in-flight requests on unmount or reload
 * - Isolated from MST: Keeps potentially large point datasets out of global state
 * - Self-contained: Contains all networking/state logic in one place
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskPoint, ScatterSettings } from "../utils/types";
import { fetchScatterPoints } from "../utils/api";

interface UseScatterBaseDataResult {
  /** All task points fetched so far (grows incrementally) */
  basePoints: TaskPoint[];
  /** Whether points are currently being fetched */
  loading: boolean;
  /** Trigger a manual refresh of all points */
  reload: () => void;
}

// Simple in-memory cache keyed by `${projectId}-${classField}` so that
// switching away from ScatterView and back doesn't trigger another long
// network fetch.  `reload()` will explicitly clear the cache.
const scatterCache = new Map<string, TaskPoint[]>();

/**
 * Hook that loads all task points for the scatter plot base layer.
 *
 * Fetches points from the API in pages, accumulating them over time.
 * Handles proper cancellation on unmount or when reload is called.
 *
 * @param projectId - Current project ID (undefined before project loaded)
 * @param settings - Scatter view settings with classField for categorization
 * @param datamanager - Optional datamanager object
 * @returns Object with basePoints array, loading state, and reload function
 */
export function useScatterBaseData(
  projectId: number | undefined,
  settings: ScatterSettings,
  datamanager?: { apiCall: (...args: any[]) => Promise<any> },
): UseScatterBaseDataResult {
  const [basePoints, setBasePoints] = useState<TaskPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Define load function that handles pagination, errors, and cleanup
  const load = useCallback(() => {
    if (!projectId) return;

    const cacheKey = `${projectId}-${settings.classField}`;

    // If we already have cached points, use them immediately and skip fetch
    if (scatterCache.has(cacheKey)) {
      setBasePoints(scatterCache.get(cacheKey)!);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBasePoints([]);
    setLoading(true);

    // Manual pagination implementation
    const fetchAllPages = async () => {
      try {
        let currentPage = 1;
        let hasMore = true;
        let accumulated: TaskPoint[] = [];

        // Loop through all pages
        while (hasMore && !ctrl.signal.aborted) {
          const result = await fetchScatterPoints({
            project: projectId,
            classField: settings.classField,
            abortSignal: ctrl.signal,
            page: currentPage,
            datamanager,
          });

          // Add this page's points to our accumulated array
          accumulated = [...accumulated, ...result.points];

          // Update state so UI reflects progress
          setBasePoints(accumulated);

          // Cache the fully loaded array for next mount
          scatterCache.set(cacheKey, accumulated);

          // Prepare for next page or exit
          hasMore = result.hasMore;
          currentPage++;
        }
      } catch (err) {
        // Suppress AbortError which is expected during cancellation
        if ((err as any).name !== "AbortError") {
          console.error("Error fetching scatter points:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    // Start the fetching process
    fetchAllPages();
  }, [projectId, settings.classField, datamanager]);

  // Trigger initial load and handle cleanup on unmount
  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // Wrapper around reload that clears cache first
  const reloadWithClear = useCallback(() => {
    if (!projectId) return;
    scatterCache.delete(`${projectId}-${settings.classField}`);
    load();
  }, [load, projectId, settings.classField]);

  return { basePoints, loading, reload: reloadWithClear };
}
