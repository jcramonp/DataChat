export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export type ChatOptions = { language: 'es' | 'en'; max_rows?: number };

export type MySQLSource = { type: 'mysql'; sqlalchemy_url: string };
export type ExcelSource = { type: 'excel'; path: string; sheet_name?: number | string | null };
export type SavedSource = { type: 'saved'; connection_id: number };
export type DataSource = MySQLSource | ExcelSource | SavedSource;

export type TableData = {
  columns: string[];
  rows: (string | number | null)[][];
};

export type Generated = { type: 'sql' | 'pandas'; code: string };

export function getAuth() {
  const token = localStorage.getItem('dc_token');
  const role = (localStorage.getItem('dc_role') as 'user' | 'admin' | null) || null;
  return { token, role };
}

export type ChatDebug = {
  question?: string;
  columns?: string[];
  dtypes?: Record<string, string>;
  llm_raw_plan?: string;      // <-- texto crudo del LLM
  plan_parsed?: any;          // <-- JSON ya parseado
  pandas_expr?: string;       // <-- expresión generada
  exec_error?: string;        // <-- mensaje de error si falló
};

export type ChatResponse = {
  answer_text: string;
  generated: { type: "pandas" | "sql"; code: string };
  table?: { columns: string[]; rows: any[][] } | null;
  notices: string[];
  debug?: ChatDebug | null;   // <-- nuevo
};

export async function askData(params: {
  token: string; // JWT
  question: string;
  datasource: DataSource;
  options?: ChatOptions; // { language, max_rows }
}): Promise<ChatResponse> {
  const { token, question, datasource, options } = params;

  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      datasource,
      options: { language: options?.language || 'es', max_rows: options?.max_rows ?? 200 },
    }),
  });

  if (res.status === 401) throw new Error('No autorizado (JWT inválido).');
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail)
        msg += ` - ${typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function login({ email, password }: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json(); // { access_token, token_type, role }
}

// ===========================
// US05 - Excel endpoints
// ===========================
export async function listExcelSheets(path: string, token: string) {
  const url = `${API_URL}/excel/sheets?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Sheets ${res.status} ${res.statusText} ${txt}`);
  }
  return res.json() as Promise<{ sheets: string[] }>;
}

export type PreviewResp = {
  sheet?: { name: string }; // opcional si no lo devuelves
  columns: string[];
  rows: (string | number | null)[][];
  page: { offset: number; limit: number; total: number };
};

export async function previewExcel(
  path: string,
  sheet_name: string | number,
  offset: number,
  limit: number,
  token: string
) {
  const params = new URLSearchParams({
    path,
    sheet_name: String(sheet_name ?? '0'),
    offset: String(offset ?? 0),
    limit: String(limit ?? 50),
  });
  const res = await fetch(`${API_URL}/excel/preview?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Preview ${res.status} ${res.statusText} ${txt}`);
  }
  return res.json() as Promise<PreviewResp>;
}