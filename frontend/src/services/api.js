const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "dc_token";
const ROLE_KEY = "dc_role";

export function setAuth({ token, role }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getAuth() {
  return {
    token: localStorage.getItem(TOKEN_KEY),
    role: localStorage.getItem(ROLE_KEY),
  };
}

/** Construye errores legibles desde fetch() */
async function errorFromResponse(r) {
  let msg = `${r.status} ${r.statusText}`;
  try {
    const data = await r.json();
    if (data && data.detail) {
      msg = Array.isArray(data.detail) ? data.detail[0]?.msg || msg : data.detail;
    }
  } catch (_) {}
  const err = new Error(msg);
  err.status = r.status;
  return err;
}

/** Login */
export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json(); // { access_token, token_type, role }
}

/** Crear usuario (admin) */
export async function registerUser(p) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json(); // { ok, email, role }
}

/**
 * Preguntar al chatbot
 * @param {{ token?:string, question:string, datasource:any, options?:{language?:"es"|"en", max_rows?:number} }} p
 */
export async function askData(p) {
  const token = p.token ?? getAuth().token;
  const body = {
    question: p.question,
    datasource: p.datasource,
    options: {
      language: p?.options?.language || "es",
      max_rows: p?.options?.max_rows ?? 200,
    },
  };
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json(); // ChatResponse
}

/** Conexiones (admin) */
export async function createConnection(p) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/connections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function listConnections() {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/connections`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

/** ⬅️ Este es el listado “público” para el desplegable */
export async function listPublicConnections() {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/connections`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json(); // [{ id, name, db_type, is_active }]
}

/** Excel (legacy por path) */
export async function listExcelSheets(path) {
  const r = await fetch(`${API_URL}/excel/sheets?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export async function previewExcel(path, sheetName, offset = 0, limit = 50) {
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

/** Admin sessions */
export async function listSessions() {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/sessions`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

export async function revokeSession(jti) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/sessions/${jti}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

/** Aliases usados por AdminSessions.tsx */
export async function listAdminSessions(tokenFromCaller) {
  const token = tokenFromCaller || getAuth().token;
  const res = await fetch(`${API_URL}/admin/sessions`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return { items, total: Number(data?.total ?? items.length) };
}

export async function revokeAdminSession(tokenFromCaller, jti) {
  const token = tokenFromCaller || getAuth().token;
  const res = await fetch(`${API_URL}/admin/sessions/${jti}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

/** Upload Excel + endpoints con file_id */
export async function uploadExcel(file, token) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${API_URL}/files/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export async function listExcelSheetsById(fileId, token) {
  const url = new URL(`${API_URL}/excel/sheets`);
  url.searchParams.set("file_id", fileId);
  const r = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export async function previewExcelById(fileId, sheet, offset, limit, token) {
  const url = new URL(`${API_URL}/excel/preview`);
  url.searchParams.set("file_id", fileId);
  url.searchParams.set("sheet_name", String(sheet));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));
  const r = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}


export async function listAdminLogs({ limit=100, offset=0, level="", action="", q="" } = {}) {
  const { token } = getAuth();
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (level) params.set("level", level);
  if (action) params.set("action", action);
  if (q) params.set("q", q);

  const res = await fetch(`${API_URL}/admin/logs?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json(); // { items, total }
}

export async function clearAdminLogs() {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/logs`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json(); // { deleted }
}