import type { MSTAnnotation, MSTControlTag, MSTStore } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import { NumbersSummary } from "./NumbersSummary";
import type { ControlTag, LabelAttrs, ObjectTagEntry, ObjectTypes } from "./types";

type TaskSummaryProps = {
  annotations: MSTAnnotation[];
  store: MSTStore["annotationStore"];
};

const TaskSummary = ({ annotations: all, store: annotationStore }: TaskSummaryProps) => {
  const task = annotationStore.store.task;
  const data = task.dataObj;
  // skip unsubmitted drafts
  const annotations = all.filter((a) => a.pk);
  const allTags = [...annotationStore.names];

  // Check if agreement should be shown based on project settings
  const showAgreement = annotationStore.store.project?.review_settings?.show_agreement_to_reviewers ?? false;

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

  const objectTags: ObjectTagEntry[] = allTags.filter(
    ([_, tag]) => tag.isObjectTag && tag.value.includes("$"),
  ) as ObjectTagEntry[];
  const dataTypes: ObjectTypes = Object.fromEntries(
    objectTags.map(([name, object]) => [
      name,
      // most of tags has `updateValue()` method which resolves `value` and stores it in `_value`
      // Image tag uses `parsedValue` instead of `_value`
      // Pdf tag uses `_url` instead of `_value`
      // for other tags with complex logic (like TimeSeries) we use `value` for now, which is not ideal
      {
        type: object.type,
        value: "parsedValue" in object ? object.parsedValue : (object._url ?? object._value ?? object.value),
      },
    ]),
  );

  const values = [
    ...(showAgreement && typeof task?.agreement === "number"
      ? [
          {
            title: "Agreement",
            value: `${task.agreement.toFixed(2)}%`,
            info: "Overall agreement over all submitted annotations",
          },
        ]
      : []),
    {
      title: "Annotations",
      // exclude draft annotations
      value: annotations.filter((a) => a.type === "annotation" && a.versions?.result?.length > 0).length,
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

export default TaskSummary;
