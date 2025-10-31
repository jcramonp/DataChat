// frontend/src/components/VoiceChrome.tsx
import { useEffect, useRef, useState } from "react";

interface VoiceChromeProps {
  onFinalText: (t: string) => void;
}

interface MinimalRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function VoiceChrome({ onFinalText }: VoiceChromeProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<MinimalRecognition | null>(null);

  useEffect(() => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const rec: MinimalRecognition = new SR();
    rec.lang = "es-ES"; // o "es-CO" si lo soporta
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (e: any) => {
      const r = e.results?.[0]?.[0]?.transcript || "";
      if (r) onFinalText(r.trim());
    };

    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    setSupported(true);

    return () => {
      // stop recognition on unmount if running
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, [onFinalText]);

  function toggle() {
    if (!supported) return;
    if (!listening) {
      recognitionRef.current?.start();
      setListening(true);
    } else {
      recognitionRef.current?.stop();
    }
  }

  return (
    <button
      onClick={toggle}
      className={`px-3 py-2 rounded-2xl shadow ${listening ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}
      disabled={!supported}
      title={supported ? "Toca para hablar" : "Navegador sin Web Speech API"}
    >
      {listening ? "Detener" : "Hablar (WebSpeech) 🎤"}
    </button>
  );
}
