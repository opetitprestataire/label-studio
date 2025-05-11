import type { MSTAnnotation, MSTControlTag, MSTObjectTag, MSTStore } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import { NumbersSummary } from "./NumbersSummary";
import type { ControlTag, LabelAttrs } from "./types";

type SummaryProps = {
  annotations: MSTAnnotation[];
  store: MSTStore["annotationStore"];
};

const Summary = ({ annotations: all, store: annotationStore }: SummaryProps) => {
  // @ts-ignore
  // @todo should be alternative way to get the agreement:
  // - DM is global
  // - it doesn't exist in Review Stream
  const task = window.DM?.taskStore.selected;
  const data = annotationStore.store.task.dataObj;
  // skip unsubmitted drafts
  const annotations = all.filter((a) => a.pk);
  const allTags = [...annotationStore.names];

  const controlTags: [string, MSTControlTag][] = allTags.filter(([_, control]) => control.isControlTag) as [
    string,
    MSTControlTag,
  ][];
  const controls: ControlTag[] = controlTags.map(([name, control]) => ({
    name,
    type: control.type,
    to_name: control.toname,
    label_attrs:
      control.children?.reduce(
        (acc, { value, background }) => {
          acc[value] = { value, background };
          return acc;
        },
        {} as Record<string, LabelAttrs>,
      ) ?? {},
    per_region: !!control.perregion,
  }));

  type ObjectTagEntry = [string, MSTObjectTag];
  type ObjectTypes = Record<string, string>;

  const objectTags: ObjectTagEntry[] = allTags.filter(([_, control]) => control.isObjectTag) as ObjectTagEntry[];
  const dataTypes: ObjectTypes = Object.fromEntries(objectTags.map(([name, object]) => [name, object.type]));

  const values = [
    {
      title: "Agreement",
      value: task?.agreement ? `${task.agreement}%` : "N/A",
      info: "Overall agreement over all submitted annotations",
    },
    {
      title: "Annotations",
      value: annotations.filter((a) => a.type === "annotation").length,
      info: "Number of submitted annotations",
    },
    {
      title: "Predictions",
      value: annotations.filter((a) => a.type === "prediction").length,
      info: "Number of predictions",
    },
  ];

  return (
    <div className="p-4">
      <h2 className="px-4">Review Summary</h2>
      <NumbersSummary values={values} />
      <LabelingSummary annotations={annotations} controls={controls} />
      <h2 className="px-4">Task Data</h2>
      <DataSummary data_types={dataTypes} data={data} />
    </div>
  );
};

export default Summary;
