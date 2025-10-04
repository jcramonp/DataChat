// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export type ChatOptions = { language: 'es' | 'en'; max_rows?: number };

export type MySQLSource = { type: 'mysql'; sqlalchemy_url: string };
export type ExcelSource = { type: 'excel'; path: string; sheet_name?: number | string | null };
export type DataSource = MySQLSource | ExcelSource;

export type TableData = {
  columns: string[];
  rows: (string | number | null)[][];
};

export type Generated = { type: 'sql' | 'pandas'; code: string };

export type ChatResponse = {
  answer_text: string;
  generated: Generated;
  table?: TableData | null;
  notices: string[];
};

export async function askData(params: {
  token: string; // JWT
  question: string;
  datasource: DataSource; // { type: "mysql" | "excel", ... }
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

export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json(); // { access_token, token_type, role }
}

