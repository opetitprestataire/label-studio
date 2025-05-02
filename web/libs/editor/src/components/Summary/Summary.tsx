import type { MSTAnnotation } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import type { ControlTag, Project } from "./types";

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
  }));

  return (
    <div className="p-4">
      <h2>Annotations ({task.agreement}% agreement)</h2>
      <LabelingSummary annotations={annotations} controls={controls} />
      <h2>Data</h2>
      <DataSummary data_types={project.data_types} data={data} />
    </div>
  );
};

export default Summary;
