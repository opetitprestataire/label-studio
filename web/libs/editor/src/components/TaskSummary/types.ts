import type { ReactNode } from "react";
import type { MSTObjectTag, MSTTagImage, RawResult } from "../../stores/types";

export type LabelAttrs = { value: string; background?: string };

export type ControlTag = {
  name: string;
  type: string;
  to_name: string;
  label_attrs: Record<string, LabelAttrs>;
  per_region?: boolean;
};

export type AnnotationSummary = {
  id: string;
  type: "annotation" | "prediction";
  results: RawResult[];
  createdBy: string;
  user: any;
};

export type ObjectTagEntry = [string, MSTObjectTag | MSTTagImage];
export type ObjectTypes = Record<string, { type: string; value: any }>;

export type RendererType = (results: RawResult[], control: ControlTag) => ReactNode;
