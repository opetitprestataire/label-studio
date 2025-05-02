import type { ReactNode } from "react";
import { Userpic } from "@humansignal/ui";
import type { MSTAnnotation, MSTResult } from "../../stores/types";
import { contrastColor, convertToRGBA } from "../../utils/colors";
import { SummaryBadge } from "./SummaryBadge";
import type { ControlTag } from "./types";

type Props = {
  annotations: MSTAnnotation[];
  controls: ControlTag[];
};

const renderers: Record<string, (results: MSTResult[], control: ControlTag) => ReactNode> = {
  Labels: (results, control) => {
    const labels = results.flatMap((result) => result.mainValue).flat();
    const labelAmounts: [string, number][] = Object.entries(
      labels.reduce((acc, label) => {
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {}),
    );
    const labelColors = Object.fromEntries(
      Object.entries(control.label_attrs).map(([lbl, attr]) => [lbl, attr.background]),
    );

    if (!labels.length) return "-";

    return (
      <span className="flex gap-2">
        {labelAmounts.map(([label, amount]) => {
          const color = labelColors[label];
          const background = color ? convertToRGBA(color, 0.3) : undefined;

          return (
            <span
              className="inline-block px-2 whitespace-nowrap rounded-4 mr-2"
              style={{
                borderLeft: `4px solid ${color ?? "var(--color-grape-200)"}`,
                color: background ? contrastColor(background) : undefined,
                background: background ?? "var(--color-grape-200)",
              }}
            >
              <b>{amount}</b> {label}
            </span>
          );
        })}
      </span>
    );
  },
  Number: (results, control) => {
    if (!results.length) return "-";

    return results[0].mainValue;
  },
  Choices: (results, control) => {
    const choices = results.flatMap((result) => result.mainValue).flat();
    const unique = [...new Set(choices)];

    if (!choices.length) return "-";

    return (
      <span className="flex gap-2">
        {unique.map((choice) => (
          <span key={choice} className="inline-block px-2 bg-primary-background border border-primary-emphasis text-accent-grape-dark whitespace-nowrap rounded-4 mr-2">
            {choice}
          </span>
        ))}
      </span>
    );
  }
};

export const LabelingSummary = ({ annotations, controls }: Props) => {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th />
          {controls.map((control) => (
            <th key={control.name} className="text-left whitespace-nowrap px-4 py-2">
              {control.name} <SummaryBadge>{control.type}</SummaryBadge>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {annotations.map((annotation) => (
          <tr key={annotation.id}>
            <td className="px-4 py-2 whitespace-nowrap flex gap-2 items-center">
              <Userpic user={annotation.user} showUsername />
              <span className="bold">{annotation.user?.displayName}</span>
              <span>#{annotation.pk ?? annotation.id}</span>
            </td>
            {controls.map((control) => {
              const results = annotation.results.filter((result) => result.from_name.name === control.name);
              const renderer = renderers[control.type];
              const text = !results.length
                ? "-"
                : renderer
                  ? renderer(results, control)
                  : `${results.length} result${results.length > 1 ? "s" : ""}`;

              return (
                <td key={control.name} className="px-4 py-2">
                  {text}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
