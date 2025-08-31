const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export type Translation = { type: 'sql' | 'excel'; text: string };
export type AskResponse = { answer: string; translation?: Translation | null };

export async function askData(question: string): Promise<AskResponse> {
  const res = await fetch(`${API_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, target: 'sql' }), // <-- explícito
  });

  // si hay error, intentamos mostrar el detalle del backend
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      // ignoramos si no hay body JSON
    }
    throw new Error(`HTTP ${res.status}${detail ? ` - ${detail}` : ''}`);
  }

  return await res.json();
}
