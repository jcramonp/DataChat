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
    role:  localStorage.getItem(ROLE_KEY),
  };
}

/**
 * Helper genérico para construir errores legibles desde fetch()
 * Lo usamos en sesiones admin y upload excel, etc.
 */
async function errorFromResponse(r) {
  let msg = `${r.status} ${r.statusText}`;
  try {
    const data = await r.json();
    if (data && data.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI a veces devuelve detail como lista de errores de validación
        msg = data.detail[0]?.msg || msg;
      } else {
        msg = data.detail;
      }
    }
  } catch (_) {}
  const err = new Error(msg);
  err.status = r.status;
  return err;
}

/** @param {{email:string, password:string}} p */
export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let msg = "Login failed";
    try {
      const j = await res.json();
      if (j?.detail) {
        msg = Array.isArray(j.detail) ? j.detail[0]?.msg || msg : j.detail;
      }
    } catch {}
    throw new Error(msg);
  }
  return res.json(); // { access_token, token_type, role }
}

/** @param {{email:string, password:string, role:"user"|"admin"}} p */
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
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin puede crear usuarios");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json(); // { ok, email, role }
}

/**
 * @param {{ token?:string, question:string, datasource:any, options?:{language?:"es"|"en", max_rows?:number} }} p
 */
export async function askData(p) {
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
        language: (p.options && p.options.language) || "es",
        max_rows: (p.options && p.options.max_rows) || 200,
      },
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
      // ARREGLO: había un typo "Beare r "
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
  const r = await fetch(
    `${API_URL}/excel/sheets?path=${encodeURIComponent(path)}`
  );
  if (!r.ok) {
    throw new Error(`No se pudieron listar hojas (${r.status})`);
  }
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
  if (!r.ok) {
    throw new Error(`No se pudo previsualizar la hoja (${r.status})`);
  }
  return r.json();
}

/**
 * listSessions = GET /admin/sessions
 * Esta función ya existía.
 * Vamos a usarla como base para listAdminSessions que pide AdminSessions.tsx
 */
export async function listSessions() {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/sessions`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  if (!res.ok) throw new Error(`Error ${res.status}`);

  // Puede ser { items: [...], total: n } o directamente un array
  const data = await res.json();
  return data;
}

/**
 * revokeSession = DELETE /admin/sessions/{jti}
 * Esta función ya existía.
 * Vamos a usarla como base para revokeAdminSession que pide AdminSessions.tsx
 */
export async function revokeSession(jti) {
  const { token } = getAuth();
  const res = await fetch(`${API_URL}/admin/sessions/${jti}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

/**
 * ⬇⬇⬇ NUEVO: adaptadores con los nombres que AdminSessions.tsx está importando ⬇⬇⬇
 *
 * AdminSessions.tsx hace:
 *   import { getAuth, listAdminSessions, revokeAdminSession } from "../services/api";
 *
 * Así que aquí creamos funciones con ESOS nombres, usando lo que ya tienes.
 */

// Esta versión fuerza siempre { items: [...], total: number }
export async function listAdminSessions(tokenFromCaller) {
  // Si el caller pasó token lo usamos, si no reusamos getAuth() interno
  const token = tokenFromCaller || getAuth().token;

  const res = await fetch(`${API_URL}/admin/sessions`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  if (!res.ok) throw await errorFromResponse(res);

  const data = await res.json();

  // Normalizamos para que AdminSessions.tsx pueda hacer setItems(...)
  let items;
  if (Array.isArray(data?.items)) {
    items = data.items;
  } else if (Array.isArray(data)) {
    // fallback si backend devuelve el array directo
    items = data;
  } else {
    items = [];
  }

  return {
    items,
    total: Number(data?.total ?? items.length),
  };
}

// Revocar sesión admin usando el mismo DELETE que ya tenías
export async function revokeAdminSession(tokenFromCaller, jti) {
  const token = tokenFromCaller || getAuth().token;

  const res = await fetch(`${API_URL}/admin/sessions/${jti}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 403) throw new Error("Solo admin");
  if (!res.ok) throw await errorFromResponse(res);

  // el backend probablemente devuelve { ok: true, jti: "..." }
  return res.json();
}

// === Upload Excel endpoints con token ===

export async function uploadExcel(file, token) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${API_URL}/files/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}

export async function listExcelSheetsById(fileId, token) {
  const url = new URL(`${API_URL}/excel/sheets`);
  url.searchParams.set("file_id", fileId);
  const r = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!r.ok) throw await errorFromResponse(r);
  return r.json();
}
