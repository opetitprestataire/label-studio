import type { MSTAnnotation } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import type { ControlTag, Project } from "./types";
import { NumbersSummary } from "./NumbersSummary";

const Summary = ({ annotations: all }: { annotations: MSTAnnotation[] }) => {
  // @ts-ignore
  const DM = window.DM;
  const project: Project = DM.project;
  const task = DM.taskStore.selected;
  const data = task.data;
  const annotations = all.filter(a => a.pk);

  const parsed_config = project.parsed_label_config;
  const controls: ControlTag[] = Object.entries(parsed_config).map(([name, control]) => ({
    name,
    type: control.type,
    to_name: control.inputs[0],
    label_attrs: control.labels_attrs,
    per_region: !annotations.every(a => a.results.filter(r => r.from_name.name === name).length <= 1)
  }));

  const values = [
    {
      title: "Agreement",
      value: `${task.agreement}%`,
      info: "Overall agreement over all submitted annotations",
    },
    {
      title: "Annotations",
      value: annotations.filter(a => a.type === "annotation").length,
      info: "Number of submitted annotations",
    },
    {
      title: "Predictions",
      value: annotations.filter(a => a.type === "prediction").length,
      info: "Number of predictions",
    },
  ];

  return (
    <div className="p-4">
      <h2 className="px-4">Review Summary</h2>
      <NumbersSummary values={values} />
      <LabelingSummary annotations={annotations} controls={controls} />
      <h2 className="px-4">Task Data</h2>
      <DataSummary data_types={project.data_types} data={data} />
    </div>
  );
};

export default Summary;
