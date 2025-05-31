import { IconSparks, Userpic } from "@humansignal/ui";
import type { MSTAnnotation } from "../../stores/types";
import { SummaryBadge } from "./SummaryBadge";
import type { ControlTag } from "./types";
import { renderers } from "./labelings";

type Props = {
  annotations: MSTAnnotation[];
  controls: ControlTag[];
};

export const LabelingSummary = ({ annotations, controls }: Props) => {
  return (
    <table className="mb-wide border border-neutral-border rounded-small border-collapse">
      <thead>
        <tr className="*:text-left *:whitespace-nowrap *:px-4 *:py-2">
          <th>Annotation ID</th>
          {controls.map((control) => (
            <th key={control.name}>
              {control.name} <SummaryBadge>{control.type}</SummaryBadge>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {annotations.map((annotation) => {
          // Skip draft annotations that don't have submitted results
          if (annotation.type !== "prediction" && (!annotation.versions.result || annotation.versions.result.length === 0)) {
            return null;
          }

          return (
            <tr key={annotation.id} className="odd:bg-neutral-surface">
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="flex gap-tight items-center h-full">
                  <Userpic
                    user={annotation.user}
                    className={annotation.type === "prediction" ? "!bg-accent-plum-subtle text-accent-plum-bold" : ""}
                  >
                    {annotation.type === "prediction" && <IconSparks style={{ width: 18, height: 18 }} />}
                  </Userpic>
                  <span>{annotation.user?.displayName ?? annotation.createdBy}</span>
                  <span>#{annotation.pk}</span>
                </div>
              </td>
              {controls.map((control) => {
                // display only submitted results, not the current draft
                let results = [];
                if (annotation.type === "prediction") {
                  results =
                    annotation.results
                      ?.map((result) => result.toJSON())
                      .filter((result) => result.from_name === control.name) ?? [];
                } else {
                  results = (annotation.versions.result ?? []).filter((result) => result.from_name === control.name);
                }
                const renderer = renderers[control.type];
                const text = !results.length
                  ? "-"
                  : (renderer?.(results, control) ?? `${results.length} result${results.length > 1 ? "s" : ""}`);

                return (
                  <td key={control.name} className="px-4 py-2">
                    {text}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
