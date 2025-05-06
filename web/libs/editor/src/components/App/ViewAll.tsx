import clsx from "clsx";
import { ff } from "@humansignal/core";
import { usePersistentState } from "@humansignal/core/lib/hooks/usePersistentState";
import type { MSTAnnotation, MSTStore } from "../../stores/types";
import Summary from "../Summary/Summary";
import Grid from "./Grid";

import styles from "./ViewAll.module.scss";

type Props = {
  store: MSTStore;
  annotations: MSTAnnotation[];
  root: any;
};

const Tab = ({ title, active, onSelect }: { title: string; active: boolean; onSelect: () => void }) => {
  return (
    <div className={clsx(styles.tab, {[styles.active]: active })} onClick={onSelect}>
      {title}
    </div>
  );
};

export const ViewAll = ({ store, annotations, root }: Props) => {
  const [tab, setTab] = usePersistentState<"summary" | "compare">("view-all-tab", "summary");

  if (ff.isActive(ff.FF_SUMMARY)) {
    return (
      <div>
        <div className={styles.tabs}>
          <Tab title="Summary" active={tab === "summary"} onSelect={() => setTab("summary")} />
          <Tab title="Grid" active={tab === "compare"} onSelect={() => setTab("compare")} />
        </div>
        {tab === "summary" && (
          <div>
            <Summary annotations={annotations} />
          </div>
        )}
        {tab === "compare" && (
          <div>
            <Grid store={store} annotations={annotations} root={root} />
          </div>
        )}
      </div>
    );
  } else {
    return <Grid store={store} annotations={annotations} root={root} />;
  }
};
