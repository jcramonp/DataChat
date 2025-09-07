const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * @param {{ token:string, question:string, datasource:{type:"mysql"|"excel", sqlalchemy_url?:string, path?:string, sheet_name?:number|string|null}, options?:{language?:"es"|"en", max_rows?:number} }} p
 */
export async function askData(p) {
  const res = await fetch(`${API_URL}/chat`, {   // 👈 ahora pega a /chat
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${p.token}`,        // 👈 manda el JWT
    },
    body: JSON.stringify({
      question: p.question,
      datasource: p.datasource,
      options: { language: (p.options && p.options.language) || "es", max_rows: (p.options && p.options.max_rows) || 200 },
    }),
  });

  if (res.status === 401) throw new Error("No autorizado (JWT inválido).");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json(); // { answer_text, generated, table, notices }
}
