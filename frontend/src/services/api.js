const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* ========= NUEVO: helpers de auth (opcional) ========= */
const TOKEN_KEY = 'dc_token';
const ROLE_KEY = 'dc_role';

export function setAuth({ token, role }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);
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

/* ========= NUEVO: login ========= */
/**
 * @param {{ email:string, password:string }} p
 * @returns {Promise<{access_token:string, token_type:string, role:"user"|"admin"}>}
 */
export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    // intenta leer detalle del backend si viene
    let msg = 'Login failed';
    try {
      const j = await res.json();
      if (j?.detail) msg = Array.isArray(j.detail) ? j.detail[0]?.msg || msg : j.detail;
    } catch (_) {}
    throw new Error(msg);
  }
  const data = await res.json(); // { access_token, token_type, role }
  return data;
}

/* ========= EXISTENTE (ligeramente mejorado): askData ========= */
/**
 * @param {{ token?:string, question:string, datasource:{type:"mysql"|"excel", sqlalchemy_url?:string, path?:string, sheet_name?:number|string|null}, options?:{language?:"es"|"en", max_rows?:number} }} p
 */
export async function askData(p) {
  // usa el token pasado o, si no viene, el guardado en localStorage
  const token = p.token || getAuth().token;

  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // solo envía header si hay token
    },
    body: JSON.stringify({
      question: p.question,
      datasource: p.datasource,
      options: {
        language: (p.options && p.options.language) || 'es',
        max_rows: (p.options && p.options.max_rows) || 200,
      },
    }),
  });

  if (res.status === 401) throw new Error('No autorizado (JWT inválido).');
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json(); // { answer_text, generated, table, notices }
}
