import { SummaryBadge } from "./SummaryBadge";
import type { Project } from "./types";

type DataSummaryProps = {
  data_types: Project["data_types"];
  data: Record<string, any>;
};

export const DataSummary = ({ data_types, data }: DataSummaryProps) => {
  return (
    <table className="table-auto w-full">
      <thead>
        <tr>
          {Object.entries(data_types).map(([field, type]) => (
            <th key={field} className="px-4 py-2 text-left whitespace-nowrap">
              {field} <SummaryBadge>{type}</SummaryBadge>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {Object.entries(data_types).map(([field, type]) => (
            <td key={field} className="px-4 py-2">
              {type === "Text" ? data[field] : field}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};
