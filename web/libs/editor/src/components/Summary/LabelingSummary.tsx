import type { ReactNode } from "react";
import { Userpic } from "@humansignal/ui";
import type { MSTAnnotation, MSTResult } from "../../stores/types";
import { contrastColor, convertToRGBA } from "../../utils/colors";
import { SummaryBadge } from "./SummaryBadge";
import type { ControlTag } from "./types";
import { renderers } from "./labelings";

type Props = {
  annotations: MSTAnnotation[];
  controls: ControlTag[];
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
              <Userpic user={annotation.user} />
              <span className="bold">{annotation.user?.displayName}</span>
              <span>#{annotation.pk ?? annotation.id}</span>
            </td>
            {controls.map((control) => {
              const results = annotation.results.filter((result) => result.from_name.name === control.name);
              const renderer = renderers[control.type];
              const text = !results.length
                ? "-"
                : renderer?.(results, control) ?? `${results.length} result${results.length > 1 ? "s" : ""}`;

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
