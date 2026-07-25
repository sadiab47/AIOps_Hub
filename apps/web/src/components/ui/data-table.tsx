import React from 'react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({ columns, data, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.01]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase bg-white/[0.02] tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className="p-4 font-semibold">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-xs text-zinc-300 divide-y divide-white/[0.04]">
          {data.map((item, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(item)}
              className={`hover:bg-white/[0.01] ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="p-4">{col.accessor(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
