import { useEffect } from "react";
import { reaction, toJS } from "mobx";

interface Options {
  /** DataManager SDK proxy providing apiCall */
  datamanager?: { apiCall: (...args: any[]) => Promise<any> };
}

/**
 * React hook that synchronises Data-Manager filters with ScatterView.
 * Whenever the active tab's filters **or** ordering change, the hook
 * requests `/api/scatter/filtered-ids` and writes the resulting list
 * into `view.scatter.filteredIds`.
 *
 * The hook is fully MobX-aware: it subscribes via `reaction` and therefore
 * re-runs automatically for any observable update without extra props.
 */
export function useScatterFilteredIds(view: any, { datamanager }: Options = {}) {
  useEffect(() => {
    if (!view || view.type !== "scatter") return;

    const dm = datamanager ?? view.root; // fall back to root that has apiCall via SDK
    if (!dm?.apiCall) return;

    // Function that performs API call & updates MST state
    const fetchIds = async () => {
      try {
        const body = {
          project: dm.projectId ?? view.root?.SDK?.projectId,
          filters: toJS(view.filterSnapshot),
          ordering: toJS(view.ordering),
        };
        // Bail out if no project yet
        if (!body.project) {
          view.scatter?.clearFiltered?.();
          return;
        }
        const resp = await dm.apiCall("scatterFilteredIds", {}, body, { allowToCancel: true });
        const ids: number[] = resp?.ids ?? [];
        view.scatter?.setFiltered(ids);
      } catch (err) {
        console.error("Scatter filtered-ids fetch error", err);
        // On any failure just clear to avoid stale highlights
        view.scatter?.clearFiltered?.();
      }
    };

    // MobX reaction: watch snapshot of filters + ordering + project ID
    const dispose = reaction(
      () => [toJS(view.filterSnapshot), toJS(view.ordering), dm.projectId],
      () => {
        fetchIds();
      },
      { fireImmediately: true },
    );

    // Dispose on unmount
    return () => dispose();
  }, [view, datamanager]);
}
