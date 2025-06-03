import { useMemo } from "react";
import { IconSparks, Userpic } from "@humansignal/ui";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import type { ColumnDef, Row } from "@tanstack/react-table";
import type { MSTAnnotation } from "../../stores/types";
import { renderers } from "./labelings";
import { SummaryBadge } from "./SummaryBadge";
import type { AnnotationSummary, ControlTag, RendererType } from "./types";

type Props = {
  annotations: MSTAnnotation[];
  controls: ControlTag[];
  onSelect: (entity: AnnotationSummary) => void;
};

const cellFn = (control: ControlTag, render: RendererType) => (props: { row: Row<AnnotationSummary> }) => {
  const annotation = props.row.original;
  const results = annotation.results.filter((result) => result.from_name === control.name);
  const content = !results.length ? "-" : (render(results, control) ?? `${results.length} result${results.length > 1 ? "s" : ""}`);
  return content;
}

const columnHelper = createColumnHelper<AnnotationSummary>();

export const LabelingSummary = ({ annotations: all, controls, onSelect }: Props) => {
  const annotations: AnnotationSummary[] = all.map((annotation) => ({
    id: annotation.pk,
    type: annotation.type,
    user: annotation.user,
    createdBy: annotation.user?.displayName ?? annotation.createdBy,
    results: annotation.type === "prediction"
      ? annotation.results?.map((result) => result.toJSON()) ?? []
      : annotation.versions.result ?? [],
  }));
  const columns = useMemo(() => {
    const columns: ColumnDef<AnnotationSummary, any>[] = controls.map((control) => (columnHelper.display({
      id: control.name,
      header: () => <>{control.name} <SummaryBadge>{control.type}</SummaryBadge></>,
      cell: cellFn(control, renderers[control.type]),
    })));
    columns.unshift({
      header: "Annotation ID",
      accessorKey: "id",
      cell: ({ row }) => {
        const annotation = row.original;

        return (
          <div className="flex gap-tight items-center cursor-pointer" onClick={() => onSelect(annotation)}>
            <Userpic
              user={annotation.user}
              className={annotation.type === "prediction" ? "!bg-accent-plum-subtle text-accent-plum-bold" : ""}
            >
              {annotation.type === "prediction" && <IconSparks size={18} />}
            </Userpic>
            <span>{annotation.user?.displayName ?? annotation.createdBy}</span>
            <span>#{annotation.id}</span>
          </div>
        );
      },
    });
    return columns;
  }, [controls, onSelect]);

  const table = useReactTable<AnnotationSummary>({
    data: annotations,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto pb-tight mb-base">
      <table className="border border-neutral-border rounded-small border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="*:text-left *:whitespace-nowrap *:px-4 *:py-2 bg-neutral-surface">
              {headerGroup.headers.map(header => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="even:bg-neutral-surface [&_td]:align-top">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
