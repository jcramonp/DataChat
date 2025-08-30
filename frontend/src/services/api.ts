const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type AskResponse = { answer: string };

export async function askData(question: string): Promise<AskResponse> {
  const res = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
