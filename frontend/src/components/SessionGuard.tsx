// frontend/src/components/SessionGuard.tsx
import React, { useEffect, useRef, useState } from "react";
import { getAuth, clearAuth, logoutServer, pingAuth } from "../services/api.ts";

const WARNING_SECONDS = 60;                 // muestra modal cuando queda ≤ 60s
const POLL_MS = 10000;                      // chequeo cada 10s
const ACTIVITY_WINDOW_MS = 15000;           // solo ping si hubo actividad en últimos 15s
const EVENTS = ["click","keydown","mousemove","scroll","touchstart"];

export default function SessionGuard() {
  const [warn, setWarn] = useState(false);
  const [remaining, setRemaining] = useState<number>(0);
  const timerId = useRef<number | null>(null);
  const lastActivity = useRef<number>(Date.now());

  // Registrar actividad del usuario
  useEffect(() => {
    const onAct = () => { lastActivity.current = Date.now(); };
    EVENTS.forEach(ev => window.addEventListener(ev, onAct, { passive: true }));
    return () => EVENTS.forEach(ev => window.removeEventListener(ev, onAct));
  }, []);

  // Bucle de ping condicionado por actividad
  useEffect(() => {
    const tick = async () => {
      try {
        const { token } = getAuth();
        if (!token) {                 // no autenticado
          setWarn(false);
          return;
        }
        // Solo hacemos ping si hubo actividad reciente
        const idleFor = Date.now() - lastActivity.current;
        if (idleFor > ACTIVITY_WINDOW_MS) {
          // sin actividad: no ping → el backend podrá expirar por inactividad
          return;
        }

        const r = await pingAuth();    // { remaining_seconds }
        const left = Math.max(0, Number(r?.remaining_seconds ?? 0));
        setRemaining(left);
        setWarn(left > 0 && left <= WARNING_SECONDS);

        if (left <= 0) {
          // Expirada por inactividad
          try { await logoutServer(); } catch {}
          clearAuth();
          window.location.replace("/login");
        }
      } catch (e: any) {
        // 401/errores: tratamos como caída de sesión
        if (e?.status === 401) {
          clearAuth();
          window.location.replace("/login");
        }
      }
    };

    // primer intento inmediato, luego bucle
    tick();
    timerId.current = window.setInterval(tick, POLL_MS);
    return () => { if (timerId.current) window.clearInterval(timerId.current); };
  }, []);

  // Usuario decide continuar: cuenta como actividad y cerramos modal
  const stay = () => {
    lastActivity.current = Date.now(); // marca actividad explícita
    setWarn(false);
  };

  // Cierre manual (criterio US15)
  const doLogout = async () => {
    try { await logoutServer(); } catch {}
    clearAuth();
    window.location.replace("/login");
  };

  if (!warn) return null;

  // Modal simple (sin dependencias de UI)
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, width: 420, maxWidth: "90%" }}>
        <h3 style={{ marginTop: 0 }}>¿Seguir conectado?</h3>
        <p>Por inactividad, tu sesión se cerrará en <b>{Math.ceil(remaining)}</b> segundos.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={doLogout}>Cerrar sesión</button>
          <button onClick={stay}>Seguir conectado</button>
        </div>
      </div>
    </div>
  );
}
