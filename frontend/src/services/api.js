// src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "dc_token";
const ROLE_KEY = "dc_role";

export function setAuth({ token, role }) {
  if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  if (role) localStorage.setItem(ROLE_KEY, role);   else localStorage.removeItem(ROLE_KEY);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}
export function getAuth() {
  return { token: localStorage.getItem(TOKEN_KEY), role: localStorage.getItem(ROLE_KEY) };
}

export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let msg = "Login failed";
    try { const j = await res.json(); if (j?.detail) msg = Array.isArray(j.detail) ? j.detail[0]?.msg || msg : j.detail; } catch {}
    throw new Error(msg);
  }
  return res.json(); // { access_token, token_type, role }
}

export async function registerUser(p) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(p),
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin puede crear usuarios");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

/**
 * @param {{ token?:string, question:string, datasource:{type:"mysql"|"excel", sqlalchemy_url?:string, path?:string, sheet_name?:number|string|null}, options?:{language?:"es"|"en", max_rows?:number} }} p
 */
export async function askData(p) {
  const token = p.token ?? getAuth().token;
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      question: p.question,
      datasource: p.datasource,
      options: { language: (p.options && p.options.language) || "es", max_rows: (p.options && p.options.max_rows) || 200 },
    }),
  });
  if (res.status === 401) throw new Error("No autorizado (JWT inválido).");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

/** @param {{name:string, db_type:"mysql"|"postgres"|"sqlite", sqlalchemy_url:string}} p */
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
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  const j = await res.json();
  if (!res.ok) throw new Error(j?.detail || `Error ${res.status}`);
  return j; // { id, name, db_type, sqlalchemy_url, is_active }
}

export async function listConnections() {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/connections`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  const j = await res.json();
  if (!res.ok) throw new Error(j?.detail || `Error ${res.status}`);
  return j; // Array<ConnectionOut>
}

// === US05 - Excel endpoints ===
export async function listExcelSheets(path) {
  const r = await fetch(`${API_URL}/excel/sheets?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`No se pudieron listar hojas (${r.status})`);
  return r.json(); // { path, sheets: [...] }
}

export async function previewExcel(path, sheetName, offset = 0, limit = 50) {
  const params = new URLSearchParams({
    path,
    sheet_name: String(sheetName ?? 0),
    offset: String(offset),
    limit: String(limit),
  });
  const r = await fetch(`${API_URL}/excel/preview?${params.toString()}`);
  if (!r.ok) throw new Error(`No se pudo previsualizar la hoja (${r.status})`);
  return r.json(); // { sheet, columns, rows, page }
}
