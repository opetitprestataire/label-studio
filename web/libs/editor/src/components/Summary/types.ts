export type LabelAttrs = { value: string; background?: string };

export type ParsedControlTag = {
  inputs: string[];
  labels: string[];
  labels_attrs: Record<string, LabelAttrs>;
  to_name: string[];
  type: string;
};

export type ControlTag = {
  name: string;
  type: string;
  to_name: string;
  label_attrs: Record<string, LabelAttrs>;
  per_region?: boolean;
};

export type Project = {
  parsed_label_config: Record<string, ParsedControlTag>;
  data_types: Record<string, string>;
};
