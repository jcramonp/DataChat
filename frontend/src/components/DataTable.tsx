// frontend/src/components/DataTable.tsx
import { useMemo, useState } from 'react';
import './DataTable.css';

type Props = {
  columns: string[];
  rows: any[][];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  className?: string;
};

export default function DataTable({
  columns,
  rows,
  pageSizeOptions = [5, 10, 20, 50],
  defaultPageSize = 10,
  className = '',
}: Props) {
  const [page, setPage] = useState(1); // 1-indexed
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // corrige el page si cambia pageSize o total
  if (page > totalPages) {
    // eslint-disable-next-line no-console
    setTimeout(() => setPage(totalPages), 0);
  }

  const slice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const go = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className={`dt-wrapper ${className}`}>
      <div className="dt-controls">
        <div className="dt-left">
          <label>
            Filas por página:&nbsp;
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <span className="dt-count">
            &nbsp;Mostrando {slice.length} de {total}
          </span>
        </div>
        <div className="dt-right">
          <button onClick={() => go(1)} disabled={page === 1}>
            « Primero
          </button>
          <button onClick={() => go(page - 1)} disabled={page === 1}>
            ‹ Anterior
          </button>
          <span className="dt-page">
            Página&nbsp;
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={e => go(Number(e.target.value))}
            />
            &nbsp;/ {totalPages}
          </span>
          <button onClick={() => go(page + 1)} disabled={page === totalPages}>
            Siguiente ›
          </button>
          <button onClick={() => go(totalPages)} disabled={page === totalPages}>
            Última »
          </button>
        </div>
      </div>

      <div className="dt-table-wrapper">
        <table className="dt-table">
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c} title={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="dt-empty">
                  Sin resultados
                </td>
              </tr>
            ) : (
              slice.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((_, i) => {
                    const v = row[i];
                    const val = v === null || v === undefined || v === '' ? '—' : String(v);
                    return <td key={i}>{val}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
