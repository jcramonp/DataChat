export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const TOKEN_KEY = 'dc_token';
const ROLE_KEY = 'dc_role';

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

export function setAuth(p: { token?: string; role?: string }) {
  if (p.token) localStorage.setItem(TOKEN_KEY, p.token);
  else localStorage.removeItem(TOKEN_KEY);

  if (p.role) localStorage.setItem(ROLE_KEY, p.role);
  else localStorage.removeItem(ROLE_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getAuth() {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return { token: "", role: "" };
    const parsed = JSON.parse(raw);
    return {
      token: parsed.token ?? "",
      role: parsed.role ?? "",
    };
  } catch {
    return { token: "", role: "" };
  }
}

// util opcional
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
  options?: { language?: 'es' | 'en'; max_rows?: number };
}) {
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

  if (res.status === 401) throw new Error('No autorizado (JWT inválido).');
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function login(p: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!res.ok) {
    let msg = 'Login failed';
    try {
      const j = await res.json();
      if (j?.detail) msg = Array.isArray(j.detail) ? j.detail[0]?.msg || msg : j.detail;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<{ access_token: string; token_type: string; role: 'user' | 'admin' }>;
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
  if (res.status === 401) throw new Error('No autorizado');
  if (res.status === 403) throw new Error('Solo admin puede crear usuarios');
  if (!res.ok) throw new Error(`Error ${res.status}`);
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

export async function listPublicConnections() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('auth_token'); // o usa tu helper getAuth()
  const res = await fetch(`${API_URL}/connections`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json(); // [{id, name, db_type, is_active}]
}


// ===========================
// US05 - Excel endpoints
// ===========================
export async function listExcelSheets(path: string): Promise<{ path: string; sheets: string[] }> {
  const r = await fetch(`${API_URL}/excel/sheets?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`No se pudieron listar hojas (${r.status})`);
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
  if (!r.ok) throw new Error(`No se pudo previsualizar (${r.status})`);
  return r.json();
}



async function errorFromResponse(r) {
  let message = `${r.status} ${r.statusText}`;
  try {
    const data = await r.json();
    if (data && data.detail) {
      message = data.detail;
    }
  } catch (err) {
    // si no es JSON dejamos message como está
  }
  const e = new Error(message);
  e.status = r.status;
  return e;
}

export async function listAdminSessions(token) {
  const res = await fetch(`${apiBase()}/admin/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw await errorFromResponse(res);
  }

  const data = await res.json();

  // forma esperada del backend: { items: [...], total: n }
  // pero por si acaso blindamos:
  let items;
  if (Array.isArray(data?.items)) {
    items = data.items;
  } else if (Array.isArray(data)) {
    // fallback si el backend devolviera directamente un array
    items = data;
  } else {
    items = [];
  }

  return {
    items,
    total: Number(data?.total ?? items.length),
  };
}


// 2. Revocar una sesión específica (admin)
export async function revokeAdminSession(token, jti) {
  const res = await fetch(`${apiBase()}/admin/sessions/${jti}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw await errorFromResponse(res);
  }

  // si llega 200 OK, no necesitamos body para continuar
  return;
}