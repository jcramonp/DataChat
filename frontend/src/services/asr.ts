export async function transcribeAudio(blob: Blob, apiBase = import.meta.env.VITE_API_URL as string) {
  const fd = new FormData();
  fd.append("file", blob, "audio.webm");

  const res = await fetch(`${apiBase}/asr/transcribe`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`ASR error ${res.status}: ${msg || "unknown"}`);
  }
  const data = await res.json();
  return data?.text?.trim?.() ?? "";
}
