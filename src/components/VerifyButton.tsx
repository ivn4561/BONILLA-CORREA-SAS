"use client";

import { useState } from "react";

export function VerifyButton() {
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="btn-ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await fetch("/api/admin/verify", { method: "POST" });
          setRes(await r.json());
          setBusy(false);
        }}
      >
        {busy ? "Verificando…" : "Verificar integridad del registro"}
      </button>
      {res && (
        <span data-testid="verify-result" className={`text-sm ${res.ok ? "text-emerald-700" : "text-red-700"}`}>
          {res.ok ? "✓ " : "✗ "}{res.message}
        </span>
      )}
    </div>
  );
}
