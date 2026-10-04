"use client";

import { useEffect, useRef, useState } from "react";

/** Código de 6 dígitos en dos grupos (482 – 731). Un solo campo real, accesible y que admite pegar. */
export function RoomCodeForm() {
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Tras un código equivocado, el campo vuelve a quedar listo para escribir.
  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return setError("Escriba los 6 dígitos del código.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recepcion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: code }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.destino === "string") {
        location.href = data.destino;
        return;
      }
      setError(data.error ?? "No se pudo comprobar el código.");
      setCode("");
    } catch {
      setError("No se pudo comprobar el código. Revise su conexión.");
    }
    setBusy(false);
  }

  const digits = Array.from({ length: 6 }, (_, i) => code[i] ?? "");
  const active = Math.min(code.length, 5);

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="room-code" className="mb-3 block text-sm text-bonny-sub">Código del cuarto</label>
      <div className="relative mx-auto flex w-fit items-center gap-1.5 sm:gap-2">
        {digits.map((d, i) => (
          <span key={i} className="contents">
            {i === 3 && <span aria-hidden className="w-2 text-center text-bonny-sub">–</span>}
            <span
              aria-hidden
              className={`grid h-14 w-10 place-items-center rounded-xl text-2xl font-medium sm:h-[60px] sm:w-[50px] ${
                focused && i === active ? "border border-bonny-ink bg-white shadow-[0_0_0_4px_rgba(0,0,0,.06)]" : "border border-transparent bg-bonny-bg"
              }`}
            >
              {d}
            </span>
          </span>
        ))}
        <input
          id="room-code"
          ref={input}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          style={{ fontSize: 16 }}
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          disabled={busy}
          aria-describedby={error ? "room-code-error" : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
      {error && <p id="room-code-error" role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <button className="btn-primary mt-6 w-full" disabled={busy || code.length !== 6}>{busy ? "Comprobando…" : "Continuar"}</button>
      <p className="mt-4 text-xs text-bonny-sub">El código se lo entrega la empresa que lo invitó.</p>
    </form>
  );
}
