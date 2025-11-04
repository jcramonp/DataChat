// frontend/src/services/api.ts (REEMPLAZO COMPLETO)

export const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

// --- helpers base URL ---
export function apiBase(): string {
  return API_URL;
}

// --- storage keys ---
const TOKEN_KEY = "dc_token";
const ROLE_KEY  = "dc_role";
const LEGACY_AUTH_KEY = "auth"; // compatibilidad

export type ChatOptions = { language: "es" | "en"; max_rows?: number };

export type MySQLSource = { type: "mysql"; sqlalchemy_url: string };
export type ExcelSource = { type: "excel"; path: string; sheet_name?: number | string | null };
export type SavedSource = { type: "saved"; connection_id: number };
export type DataSource = MySQLSource | ExcelSource | SavedSource;

export type TableData = {
  columns: string[];
  rows: (string | number | null)[][];
};

export type Generated = { type: "sql" | "pandas"; code: string };

// ----------------------
// Auth: set/get/clear
// ----------------------
export function setAuth(p: { token?: string; role?: string }) {
  // Guarda en claves nuevas...
  if (p.token) localStorage.setItem(TOKEN_KEY, p.token);
  else localStorage.removeItem(TOKEN_KEY);

  if (p.role) localStorage.setItem(ROLE_KEY, p.role);
  else localStorage.removeItem(ROLE_KEY);

  // ...y también en legacy "auth" por compatibilidad
  if (p.token || p.role) {
    localStorage.setItem(LEGACY_AUTH_KEY, JSON.stringify({
      token: p.token ?? "",
      role:  p.role  ?? "",
    }));
  } else {
    localStorage.removeItem(LEGACY_AUTH_KEY);
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(LEGACY_AUTH_KEY);
}

export function getAuth(): { token: string; role: string } {
  // 1) Intenta claves nuevas
  const tk = localStorage.getItem(TOKEN_KEY) || "";
  const rl = localStorage.getItem(ROLE_KEY)  || "";
  if (tk || rl) return { token: tk, role: rl };

  // 2) Fallback compatibilidad
  try {
    const raw = localStorage.getItem(LEGACY_AUTH_KEY);
    if (!raw) return { token: "", role: "" };
    const parsed = JSON.parse(raw);
    return {
      token: parsed?.token ?? "",
      role:  parsed?.role  ?? "",
    };
  } catch {
    return { token: "", role: "" };
  }
}

// ----------------------
// Utils HTTP
// ----------------------
async function errorFromResponse(r: Response): Promise<Error & { status?: number }> {
  let message = `${r.status} ${r.statusText}`;
  try {
    const data = await r.json();
    if (data && (data.detail || data.message)) {
      message = data.detail || data.message;
    }
  } catch { /* ignore */ }
  const e = new Error(message) as Error & { status?: number };
  e.status = r.status;
  return e;
}

export async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// ----------------------
// Chat
// ----------------------
export type ChatResponse = {
  answer: string;
  table?: TableData;
  generated?: Generated;
  error?: string;
};

export async function askData(p: {
  token?: string;
  question: string;
  datasource: any;
  options?: { language?: "es" | "en"; max_rows?: number };
}) {
  const token = p.token ?? getAuth().token;
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question: p.question,
      datasource: p.datasource,
      options: {
        language: p.options?.language ?? "es",
        max_rows: p.options?.max_rows ?? 200,
      },
    }),
  });

  if (res.status === 401) throw new Error("No autorizado (JWT inválido).");
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// ----------------------
// Auth endpoints
// ----------------------
export async function login(p: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) {
    let msg = "Login failed";
    try {
      const j = await res.json();
      if (j?.detail) msg = Array.isArray(j.detail) ? j.detail[0]?.msg || msg : j.detail;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<{ access_token: string; token_type: string; role: "user" | "admin" }>;
}

export async function registerUser(p: { email: string; password: string; role: "user" | "admin" }) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(p),
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin puede crear usuarios");
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function logoutServer() {
  const { token } = getAuth();
  if (!token) return;
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// ----------------------
// US05 - Excel endpoints
// ----------------------
export async function listExcelSheets(path: string): Promise<{ path: string; sheets: string[] }> {
  const r = await fetch(`${API_URL}/excel/sheets?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export type PreviewResp = {
  sheet: { name: string };
  columns: string[];
  rows: (string | number | null)[][];
  page: { offset: number; limit: number; total: number };
};

export async function previewExcel(
  path: string,
  sheetName: string | number | undefined,
  offset = 0,
  limit = 50
): Promise<PreviewResp> {
  const params = new URLSearchParams({
    path,
    sheet_name: String(sheetName ?? 0),
    offset: String(offset),
    limit: String(limit),
  });
  const r = await fetch(`${API_URL}/excel/preview?${params.toString()}`);
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

// ----------------------
// Admin sessions (US15)
// ----------------------
export async function listAdminSessions(token: string) {
  const res = await fetch(`${apiBase()}/admin/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await errorFromResponse(res);

  const data = await res.json();
  let items;
  if (Array.isArray(data?.items)) items = data.items;
  else if (Array.isArray(data)) items = data;
  else items = [];

  return { items, total: Number(data?.total ?? items.length) };
}

export async function revokeAdminSession(token: string, jti: string) {
  const res = await fetch(`${apiBase()}/admin/sessions/${encodeURIComponent(jti)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await errorFromResponse(res);
  return;
}

// ----------------------
// Ping sesión (US15)
// ----------------------
export async function pingAuth(token: string) {
  const res = await fetch(`${API_URL}/auth/ping`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const e = new Error(`Ping failed: ${res.status}`) as Error & { status?: number };
    (e as any).status = res.status;
    throw e;
  }
  return res.json() as Promise<{ now: number; last_seen: number; remaining_seconds: number }>;
}
