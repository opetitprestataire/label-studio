import { IconInfoOutline, IconSettings } from "@humansignal/icons";
import { Button, Tooltip } from "@humansignal/ui";
import { Elem } from "../../utils/bem";
import { isSelfServe } from "../../utils/billing";
import { FF_BULK_ANNOTATION } from "../../utils/feature-flags";
import { AutoAcceptToggle } from "../AnnotationTab/AutoAcceptToggle";
import { DynamicPreannotationsToggle } from "../AnnotationTab/DynamicPreannotationsToggle";
import { GroundTruth } from "../CurrentEntity/GroundTruth";
import { EditingHistory } from "./HistoryActions";

export const Actions = ({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore.selected;
  const isPrediction = entity?.type === "prediction";
  const isViewAll = annotationStore.viewingAll === true;
  const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isSelfServe() && store.hasInterface("annotation:bulk");

  return (
    <Elem name="section">
      {!isPrediction && !isViewAll && store.hasInterface("edit-history") && <EditingHistory entity={entity} />}

      {store.description && store.hasInterface("instruction") && (
        <Tooltip alignment="top-left" title="Show instructions">
          <Button
            type="text"
            aria-label="Instructions"
            size="small"
            variant="neutral"
            onClick={() => store.toggleDescription()}
          >
            <IconInfoOutline />
          </Button>
        </Tooltip>
      )}
      <Tooltip alignment="top-left" title="Settings">
        <Button
          type="text"
          aria-label="Settings"
          size="small"
          variant="neutral"
          onClick={() => store.toggleSettings()}
        >
          <IconSettings />
        </Button>
      </Tooltip>

      {store.hasInterface("ground-truth") && !isBulkMode && <GroundTruth entity={entity} />}

      {!isViewAll && (
        <Elem name="section">
          <DynamicPreannotationsToggle />
          <AutoAcceptToggle />
        </Elem>
      )}
    </Elem>
  );
};
