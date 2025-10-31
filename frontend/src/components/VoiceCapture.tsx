import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../services/asr";

type Props = {
  onFinalText: (text: string) => void;   // qué hacer con el texto final (ej: submitPrompt(text))
  apiBase?: string;                      // opcional, por si quieres overriding del VITE_API_URL
  maxSeconds?: number;                   // duración máxima de grabación
};

export default function VoiceCapture({ onFinalText, apiBase, maxSeconds = 20 }: Props) {
  const [supported, setSupported] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Idle");
  const [hint, setHint] = useState<string>("Toca para hablar");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(!!(navigator.mediaDevices && (window as any).MediaRecorder));
  }, []);

  useEffect(() => {
    return () => {
      // cleanup: detener si algo quedó abierto
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    };
  }, []);

  async function startRecording() {
    try {
      setStatus("Solicitando micrófono…");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      // Si alguna plataforma no soporta webm, se podría caer a audio/ogg en algunos browsers.
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstart = () => {
        setRecording(true);
        setStatus("Grabando…");
        setHint("Vuelve a tocar para detener");
        if (maxSeconds > 0) {
          stopTimerRef.current = window.setTimeout(() => {
            stopRecording();
          }, maxSeconds * 1000);
        }
      };

      mr.onstop = async () => {
        setRecording(false);
        setStatus("Procesando audio…");
        setHint("Procesando…");
        // detener tracks del stream
        stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          const text = await transcribeAudio(blob, apiBase);
          if (text && text.length > 0) {
            setStatus("Listo");
            setHint("Toca para hablar");
            onFinalText(text);
          } else {
            setStatus("Sin texto (¿hablaste?)");
            setHint("Toca para reintentar");
          }
        } catch (err: any) {
          console.error(err);
          setStatus(`Error: ${err?.message || "ASR failed"}`);
          setHint("Toca para reintentar");
        }
      };

      mediaRecorderRef.current = mr;
      mr.start(); // comienza a grabar
    } catch (e: any) {
      console.error(e);
      setStatus("Permiso denegado o no disponible");
      setHint("Verifica HTTPS/permiso micrófono");
    }
  }

  function stopRecording() {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
  }

  function toggle() {
    if (!supported) return;
    if (!recording) startRecording();
    else stopRecording();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        title={supported ? hint : "Navegador sin soporte para grabación"}
        className={`px-3 py-2 rounded-2xl shadow ${recording ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}
        disabled={!supported}
      >
        {recording ? "Detener" : "Hablar 🎤"}
      </button>
      <span className="text-sm opacity-80">{status}</span>
    </div>
  );
}
