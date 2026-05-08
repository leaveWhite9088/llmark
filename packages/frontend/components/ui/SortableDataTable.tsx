"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { getSpeedRating, getRatingScore } from "@/lib/utils";

type SortOrder = "asc" | "desc";

type ColumnDef<T> = {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  width?: string;
  render: (item: T, index: number) => React.ReactNode;
  getValue?: (item: T) => string | number | null;
};

type SortableDataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  defaultSortField?: string;
  defaultSortOrder?: SortOrder;
  emptyMessage?: string;
  emptySubMessage?: string;
  keyExtractor: (item: T, index: number) => string;
};

export default function SortableDataTable<T>({
  data,
  columns,
  defaultSortField,
  defaultSortOrder = "desc",
  emptyMessage = "暂无数据",
  emptySubMessage = "请尝试调整筛选条件",
  keyExtractor,
}: SortableDataTableProps<T>) {
  const [sortField, setSortField] = useState<string | undefined>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    const column = columns.find((c) => c.key === sortField);
    if (!column || !column.sortable || !column.getValue) return data;

    const items = [...data];
    items.sort((a, b) => {
      let comparison = 0;
      const aVal = column.getValue!(a);
      const bVal = column.getValue!(b);

      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
    return items;
  }, [data, sortField, sortOrder, columns]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="ml-1" />
    ) : (
      <ArrowDown size={12} className="ml-1" />
    );
  };

  const getHeaderClass = (field: string) => {
    return sortField === field
      ? "text-theme-accent-success"
      : "text-theme-text-muted hover:text-theme-text-secondary";
  };

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          className="text-theme-text-disabled"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <p className="mt-3 text-sm text-theme-text-muted">{emptyMessage}</p>
        <p className="mt-1 text-xs text-theme-text-disabled">{emptySubMessage}</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-theme-border-subtle bg-theme-bg-quaternary/50">
          {columns.map((col) => (
            <th
              key={col.key}
              className={`px-4 py-3 text-xs font-medium ${
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                  ? "text-center"
                  : "text-left"
              }`}
            >
              {col.sortable ? (
                <button
                  onClick={() => handleSort(col.key)}
                  className={`flex items-center transition-colors ${
                    col.align === "right"
                      ? "ml-auto justify-end"
                      : col.align === "center"
                      ? "w-full justify-center"
                      : ""
                  } ${getHeaderClass(col.key)}`}
                >
                  {col.header}
                  <SortIcon field={col.key} />
                </button>
              ) : (
                <span className="text-theme-text-muted">{col.header}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((item, index) => (
          <tr
            key={keyExtractor(item, index)}
            className="border-b border-theme-border-subtle/50 transition-colors hover:bg-theme-bg-quaternary/30"
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-4 py-3 ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                }`}
              >
                {col.render(item, index)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 重新导出辅助函数供外部使用（保持向后兼容）
export { getSpeedRating, getRatingScore } from "@/lib/utils";
