/**
 * Scatter API client
 *
 * Provides a Promise-based API facade for fetching task points
 * for the scatter plot. Isolates network logic from UI components.
 */
import type { TaskPoint } from "./types";

export interface ScatterFetchOptions {
  /** Project ID to fetch tasks for */
  project: number;
  /** Field in task.data that contains classification information (for coloring) */
  classField: string;
  /** Optional signal for cancellation */
  abortSignal?: AbortSignal;
  /** Optional page number (default: 1) */
  page?: number;
  /** Optional page size (server default is 1000) */
  pageSize?: number;
  /** Callback fired with progress information */
  onProgress?: (current: number, total: number) => void;
  /** DataManager instance providing apiCall (preferred over window.fetch) */
  datamanager?: { apiCall: (...args: any[]) => Promise<any> };
}

export interface ScatterFetchResult {
  /** Points from this fetch operation */
  points: TaskPoint[];
  /** Total number of available points */
  total: number;
  /** Current page number */
  page: number;
  /** Page size (usually 1000) */
  pageSize: number;
  /** Whether there are more pages to fetch */
  hasMore: boolean;
}

/**
 * Fetches a single page of task points from the `/api/scatter/tasks` endpoint.
 *
 * @param options - Fetch options including project ID, field mappings, and pagination
 * @returns Promise resolving to points and pagination metadata
 */
export async function fetchScatterPoints(options: ScatterFetchOptions): Promise<ScatterFetchResult> {
  const { project, classField, abortSignal, page = 1, pageSize = 10000, onProgress, datamanager } = options;

  // Build params object once so we can reuse in either apiCall or fetch
  const paramsObject: Record<string, string | number> = {
    project,
    x: "x",
    y: "y",
    class: classField,
    text: "text",
    r: "r",
    page,
    page_size: pageSize,
  };

  // Response placeholder
  let json: any;

  if (datamanager?.apiCall) {
    // Prefer DataManager apiCall according to DataManager API usage conventions
    json = await datamanager.apiCall("scatterTasks", paramsObject, undefined, {
      allowToCancel: true,
      alwaysExpectJSON: true,
    });
  } else {
    // Fallback to plain fetch for environments where DataManager is not available (e.g. Storybook)
    const queryParams = new URLSearchParams(Object.entries(paramsObject).map(([k, v]) => [k, String(v)]));
    const resp = await fetch(`/api/scatter/tasks?${queryParams.toString()}`, {
      signal: abortSignal,
    });

    if (!resp.ok) {
      throw new Error(`Scatter API error ${resp.status}`);
    }

    json = await resp.json();
  }

  const tasks = json.tasks as any[];
  const total: number = json.total;
  const actualPageSize: number = json.page_size ?? pageSize;

  // Map API response to TaskPoint format
  const points: TaskPoint[] = tasks.map((t) => ({
    id: String(t.id),
    data: {
      x: t.x,
      y: t.y,
      r: t.r,
      text: t.text,
      class: t.class,
      time: t.time,
    },
  }));

  onProgress?.(points.length + (page - 1) * actualPageSize, total);

  return {
    points,
    total,
    page,
    pageSize: actualPageSize,
    hasMore: points.length === actualPageSize && page * actualPageSize < total,
  };
}
