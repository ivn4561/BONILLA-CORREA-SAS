"use client";

import { useEffect, useRef, useState } from "react";

const WARNING_SECONDS = 60;

/** Cierra la sesión tras N minutos sin actividad (el servidor también lo verifica). */
export function IdleGuard({ idleMinutes }: { idleMinutes: number }) {
  const lastInput = useRef(0);
  const lastPing = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    lastInput.current = lastPing.current = Date.now();
    const mark = () => { lastInput.current = Date.now(); };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const logout = async () => {
      await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo: "inactividad" }) }).catch(() => {});
      location.href = "/login?motivo=inactividad";
    };

    const timer = setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastInput.current;
      const limit = idleMinutes * 60_000;
      if (idleMs >= limit) return logout();
      if (idleMs >= limit - WARNING_SECONDS * 1000) setRemaining(Math.ceil((limit - idleMs) / 1000));
      else setRemaining(null);
      // Avisa al servidor de la actividad real (como máximo una vez por minuto).
      if (lastInput.current > lastPing.current && now - lastPing.current > 60_000) {
        lastPing.current = now;
        fetch("/api/activity", { method: "POST" }).then((r) => { if (r.status === 401) location.href = "/login?motivo=inactividad"; }).catch(() => {});
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [idleMinutes]);

  if (remaining === null) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/60 p-4">
      <div className="card max-w-sm p-6 text-center">
        <p className="eyebrow">Inactividad</p>
        <h2 className="mt-2 font-serif text-2xl text-navy">Su sesión se cerrará en {remaining} s</h2>
        <button
          className="btn-primary mt-5"
          onClick={() => { lastInput.current = Date.now(); lastPing.current = Date.now(); fetch("/api/activity", { method: "POST" }); setRemaining(null); }}
        >
          Seguir conectado
        </button>
      </div>
    </div>
  );
}
