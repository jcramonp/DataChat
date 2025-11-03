export type HistoryItem = {
  id: number;
  question: string;
  datasource: Record<string, any>;
  generated: { type: string; code: string };
  row_count: number;
  created_at: string;
  answer_text: string;
};

export async function fetchHistory(apiBase: string, token: string, limit = 100) {
  const base = apiBase.replace(/\/$/, '');
  const res = await fetch(`${base}/history?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error fetching history: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = await res.json();
  return data.items as HistoryItem[];
}

export async function clearHistory(apiBase: string, token: string) {
  const base = apiBase.replace(/\/$/, '');
  const res = await fetch(`${base}/history`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error clearing history: ${res.status} ${res.statusText} ${txt}`);
  }
  return true;
}
