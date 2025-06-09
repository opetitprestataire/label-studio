import type { MSTControlTag } from "../../stores/types";
import { contrastColor, convertToRGBA } from "../../utils/colors";
import { ControlTag, LabelColors, LabelCounts } from "./types";

const defaultLabelColor = "var(--color-grape-200)";

export const getLabelColors = (control: MSTControlTag) => {
  if (!control.children) return {};

  const labelColors: Record<string, LabelColors> = {};
  
  for (const item of control.children) {
    const color = item.background;
    const background = color ? convertToRGBA(color, 0.3) : undefined;

    labelColors[item.value] = {
      value: item.value,
      border: color ?? defaultLabelColor,
      color: background ? contrastColor(background) : undefined,
      background: background ?? defaultLabelColor,
    }
  }
  
  return labelColors;
};

export const getLabelCounts = (labels: string[], labelColors: Record<string, LabelColors>) => {
  const labelCounts: Record<string, LabelCounts> = Object.fromEntries(
    Object.entries(labelColors).map(([lbl, attr]) => [lbl, { ...attr, count: 0 }]),
  );

  for (const label of labels) {
    let data = labelCounts[label];
    if (!data) {
      data = labelCounts[label] = { count: 0, border: defaultLabelColor, value: label, background: defaultLabelColor };
    }
    data.count++;
  }

  return labelCounts;
};

export const sortControls = (controls: ControlTag[]) => {
  return controls.sort((a, b) => {
    if (a.per_region && !b.per_region) return 1;
    if (!a.per_region && b.per_region) return -1;
    // for non-per-region controls, put classification controls first and labels next
    if (a.type.endsWith("labels") && !b.type.endsWith("labels")) return 1;
    if (!a.type.endsWith("labels") && b.type.endsWith("labels")) return -1;
    return 0;
  });
}
