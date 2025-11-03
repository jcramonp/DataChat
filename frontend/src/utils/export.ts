function sanitizeCell(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return String(v);
}

export function tableToCSV(columns: string[], rows: any[][]): string {
  const escape = (s: string) => {
    const needs = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needs ? `"${escaped}"` : escaped;
  };
  const head = columns.map(c => escape(String(c))).join(",");
  const body = rows.map(r => r.map(v => escape(sanitizeCell(v))).join(",")).join("\n");
  return head + "\n" + body + "\n";
}

export function downloadBlob(filename: string, mime: string, data: BlobPart | BlobPart[]) {
  const blob = Array.isArray(data) ? new Blob(data, { type: mime }) : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportAsXLSX(filename: string, columns: string[], rows: any[][]) {
  const XLSX = await import("xlsx"); // carga dinámica
  const aoa = [columns, ...rows.map(r => r.map(sanitizeCell))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", wbout);
}
