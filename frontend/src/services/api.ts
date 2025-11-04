// src/services/api.ts
const _API_URL_ENV = (import.meta as any).env?.VITE_API_URL as string | undefined;

if (!_API_URL_ENV) {
  // Fail fast: así nunca intentará 127.0.0.1 en producción
  throw new Error('VITE_API_URL is not set');
}

// Normalizamos quitando cualquier "/" final para evitar "//" al concatenar
export const API_URL: string = _API_URL_ENV.replace(/\/+$/, '');

const TOKEN_KEY = 'dc_token';
const ROLE_KEY = 'dc_role';

// ===== Tipos =====
export type Lang = 'es' | 'en';

export type ChatOptions = {
  language: Lang;
  max_rows?: number;
};

export type MySQLSource = { type: 'mysql'; sqlalchemy_url: string };
// Modo legacy por path (lo mantengo porque tu MainPage lo usa en algunos sitios)
export type ExcelSource = { type: 'excel'; path: string; sheet_name?: number | string | null };
export type SavedSource = { type: 'saved'; connection_id: number };
export type DataSource = MySQLSource | ExcelSource | SavedSource;

export type TableData = {
  columns: string[];
  rows: (string | number | null)[][];
};

export type Generated = { type: 'sql' | 'pandas'; code: string };

// ChatResponse real del backend
export type ChatResponse = {
  answer_text: string;              // <-- tu backend devuelve answer_text
  table?: TableData | null;
  generated: Generated;
  notices?: string[];
};

// Conexiones públicas
export interface PublicConnectionOut {
  id: number;
  name: string;
  db_type: string;
  is_active: boolean;
}

// Admin (sessions)
export interface AdminSessionItem {
  jti: string;
  sub: string;
  role: string;
  issued_at: number | null;
  expires_at: number | null;
  last_seen: number | null;
  revoked: boolean;
  expired?: boolean;
}
export interface AdminSessionsList {
  items: AdminSessionItem[];
  total: number;
}

// Admin (logs)
export interface ActivityItem {
  id: number;
  ts: string;
  level: string; // 'info' | 'warning' | 'error' | otros
  actor: string;
  action: string;
  path: string;
  meta: Record<string, any>;
}
export interface ActivityList {
  items: ActivityItem[];
  total: number;
}

// Excel preview por file_id
export interface ExcelPreviewPage {
  offset: number;
  limit: number;
  total: number;
}
export interface ExcelPreviewResponse {
  columns: string[];
  rows: (string | number | null)[][];
  page: ExcelPreviewPage;
}

// ===== Auth helpers =====
export function setAuth(p: { token?: string; role?: string }) {
  if (p.token) localStorage.setItem(TOKEN_KEY, p.token);
  else localStorage.removeItem(TOKEN_KEY);

  if (p.role) localStorage.setItem(ROLE_KEY, p.role);
  else localStorage.removeItem(ROLE_KEY);

  // opcional: también guarda el objeto combinado para compatibilidad con tu versión previa
  if (p.token || p.role) {
    const merged = {
      token: p.token ?? '',
      role: p.role ?? '',
    };
    localStorage.setItem('auth', JSON.stringify(merged));
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem('auth');
}

/**
 * Compatibilidad:
 * - Primero intenta leer dc_token/dc_role (formato nuevo).
 * - Si no existen, intenta el JSON "auth" que usabas antes.
 */
export function getAuth(): { token: string; role: string } {
  const tk = localStorage.getItem(TOKEN_KEY);
  const rl = localStorage.getItem(ROLE_KEY);
  if (tk || rl) return { token: tk ?? '', role: rl ?? '' };

  try {
    const raw = localStorage.getItem('auth');
    if (!raw) return { token: '', role: '' };
    const parsed = JSON.parse(raw);
    return {
      token: parsed?.token ?? '',
      role: parsed?.role ?? '',
    };
  } catch {
    return { token: '', role: '' };
  }
}

// ===== util opcional =====
export async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText} ${txt}`);
  }
  return res.json();
}

// ===== Error helper tipado =====
class ResponseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ResponseError';
    this.status = status;
  }
}
async function errorFromResponse(r: Response): Promise<ResponseError> {
  let message = `${r.status} ${r.statusText}`;
  try {
    const data = await r.json();
    if (data && data.detail) {
      message = Array.isArray(data.detail) ? data.detail[0]?.msg || message : data.detail;
    }
  } catch {
    // ignore
  }
  return new ResponseError(message, r.status);
}

// ===== Auth API =====
export async function login(p: { email: string; password: string }): Promise<{
  access_token: string;
  token_type: string;
  role: 'user' | 'admin';
}> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function registerUser(p: { email: string; password: string; role: 'user' | 'admin' }) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function logoutServer() {
  const { token } = getAuth();
  if (!token) return;
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// ===== Chat =====
export async function askData(p: {
  token?: string;
  question: string;
  datasource: any;
  options?: { language?: Lang; max_rows?: number };
}): Promise<ChatResponse> {
  const token = p.token ?? getAuth().token;
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question: p.question,
      datasource: p.datasource,
      options: {
        language: p.options?.language ?? 'es',
        max_rows: p.options?.max_rows ?? 200,
      },
    }),
  });

  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// ===== Conexiones (admin y públicas) =====
export async function createConnection(p: {
  name: string;
  db_type: 'mysql' | 'postgres' | 'sqlite';
  sqlalchemy_url: string;
}) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function listConnections(): Promise<any[]> {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/connections`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function listPublicConnections(): Promise<PublicConnectionOut[]> {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/connections`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// ===== Excel (legacy por path) =====
export async function listExcelSheets(path: string): Promise<{ path?: string; sheets: string[] }> {
  const r = await fetch(`${API_URL}/excel/sheets?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export type PreviewResp = {
  sheet?: { name: string }; // tu backend no siempre lo manda; lo dejo opcional
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

// ===== Upload Excel + endpoints por file_id (nuevos) =====
export async function uploadExcel(
  file: File,
  token: string
): Promise<{ file_id: string; filename: string; size_bytes: number; mime: string }> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${API_URL}/files/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export async function listExcelSheetsById(
  fileId: string,
  token: string
): Promise<{ sheets: string[] }> {
  const url = new URL(`${API_URL}/excel/sheets`);
  url.searchParams.set('file_id', fileId);
  const r = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export async function previewExcelById(
  fileId: string,
  sheet: string | number | undefined,
  offset: number,
  limit: number,
  token: string
): Promise<ExcelPreviewResponse> {
  const url = new URL(`${API_URL}/excel/preview`);
  url.searchParams.set('file_id', fileId);
  url.searchParams.set('sheet_name', String(sheet));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', String(limit));
  const r = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

// ===== Admin Sessions =====
export async function listSessions(): Promise<AdminSessionsList | any> {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/sessions`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function revokeSession(jti: string): Promise<any> {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/sessions/${jti}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

/** Aliases usados por AdminSessions.tsx */
export async function listAdminSessions(tokenFromCaller?: string): Promise<AdminSessionsList> {
  const token = tokenFromCaller || getAuth().token || undefined;
  const res = await fetch(`${API_URL}/admin/sessions`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  const data = await res.json();
  const items: AdminSessionItem[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];
  return { items, total: Number(data?.total ?? items.length) };
}

export async function revokeAdminSession(tokenFromCaller: string | undefined, jti: string): Promise<any> {
  const token = tokenFromCaller || getAuth().token || undefined;
  const res = await fetch(`${API_URL}/admin/sessions/${jti}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// ===== Admin Logs =====
export async function listAdminLogs(p: {
  limit?: number;
  offset?: number;
  level?: string;
  action?: string;
  q?: string;
} = {}): Promise<ActivityList> {
  const { token } = getAuth();
  const params = new URLSearchParams();
  params.set('limit', String(p.limit ?? 100));
  params.set('offset', String(p.offset ?? 0));
  if (p.level) params.set('level', p.level);
  if (p.action) params.set('action', p.action);
  if (p.q) params.set('q', p.q);

  const res = await fetch(`${API_URL}/admin/logs?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new ResponseError('No autorizado', 401);
  if (res.status === 403) throw new ResponseError('Solo admin', 403);
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function clearAdminLogs(): Promise<{ deleted: number }> {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/logs`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new ResponseError('No autorizado', 401);
  if (res.status === 403) throw new ResponseError('Solo admin', 403);
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}
