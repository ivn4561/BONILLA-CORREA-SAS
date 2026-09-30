"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Stage = "loading" | "anon" | "denied" | "mfa_enroll" | "mfa_verify" | "change_password" | "consent" | "ok";

const MOTIVOS: Record<string, string> = {
  inactividad: "Su sesión se cerró por inactividad.",
  vencido: "Su periodo de acceso ha finalizado.",
  revocado: "Su acceso fue retirado por el administrador.",
  sin_perfil: "Su usuario no tiene acceso habilitado.",
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptData, setAcceptData] = useState(false);

  const go = useCallback((s: Stage) => {
    setError(null);
    setCode("");
    if (s === "ok") {
      router.replace("/");
      router.refresh();
    } else setStage(s);
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/state").then((r) => r.json()).then((d) => go(!d.stage || d.stage === "denied" ? "anon" : d.stage)).catch(() => setStage("anon"));
  }, [go]);

  useEffect(() => {
    if (stage !== "mfa_enroll" || enroll) return;
    post("/api/auth/mfa/enroll", {}).then(({ ok, data }) => (ok ? setEnroll(data) : setError(data.error ?? "Error")));
  }, [stage, enroll]);

  async function submit(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await fn(); } finally { setBusy(false); }
  }

  const motivo = params.get("motivo");

  if (stage === "loading") return <p className="text-sm text-muted">Cargando…</p>;

  return (
    <div>
      {motivo && MOTIVOS[motivo] && stage === "anon" && (
        <div className="mb-6 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-navy">{MOTIVOS[motivo]}</div>
      )}

      {stage === "anon" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(async () => {
              const { ok, data } = await post("/api/auth/login", { email, password });
              if (!ok) setError(data.error ?? "No se pudo iniciar sesión.");
              else { setPassword(""); go(data.stage); }
            });
          }}
          className="space-y-5"
        >
          <div>
            <p className="eyebrow">Ingreso</p>
            <h2 className="mt-1 font-serif text-3xl text-navy">Iniciar sesión</h2>
          </div>
          <div>
            <label className="label" htmlFor="email">Correo electrónico</label>
            <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Verificando…" : "Continuar"}</button>
          <p className="text-xs text-muted">El acceso es solo por invitación. Si no tiene usuario, solicítelo al administrador del cuarto de datos.</p>
        </form>
      )}

      {stage === "mfa_enroll" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(async () => {
              const { ok, data } = await post("/api/auth/mfa/verify", { code, factorId: enroll?.factorId });
              if (!ok) setError(data.error ?? "Código incorrecto.");
              else go(data.stage);
            });
          }}
          className="space-y-5"
        >
          <div>
            <p className="eyebrow">Paso obligatorio</p>
            <h2 className="mt-1 font-serif text-3xl text-navy">Active la verificación en dos pasos</h2>
            <p className="mt-2 text-sm text-muted">Escanee el código con Google Authenticator, Microsoft Authenticator o Authy y escriba el código de 6 dígitos.</p>
          </div>
          {enroll ? (
            <div className="card flex flex-col items-center gap-3 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="Código QR para la app de autenticación" width={180} height={180} />
              <p className="text-center text-[0.7rem] text-muted">¿No puede escanear? Clave manual:<br /><code className="break-all font-mono text-navy">{enroll.secret}</code></p>
            </div>
          ) : <p className="text-sm text-muted">Generando código…</p>}
          <CodeInput value={code} onChange={setCode} />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || code.length !== 6 || !enroll}>Activar y continuar</button>
          <LogoutLink />
        </form>
      )}

      {stage === "mfa_verify" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(async () => {
              const { ok, data } = await post("/api/auth/mfa/verify", { code });
              if (!ok) setError(data.error ?? "Código incorrecto.");
              else go(data.stage);
            });
          }}
          className="space-y-5"
        >
          <div>
            <p className="eyebrow">Verificación en dos pasos</p>
            <h2 className="mt-1 font-serif text-3xl text-navy">Código de seguridad</h2>
            <p className="mt-2 text-sm text-muted">Abra su app de autenticación y escriba el código de 6 dígitos.</p>
          </div>
          <CodeInput value={code} onChange={setCode} />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>Verificar</button>
          <LogoutLink />
        </form>
      )}

      {stage === "change_password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newPw !== newPw2) return setError("Las contraseñas no coinciden.");
            submit(async () => {
              const { ok, data } = await post("/api/auth/password", { password: newPw });
              if (!ok) setError(data.error ?? "No se pudo cambiar la contraseña.");
              else go(data.stage ?? "ok");
            });
          }}
          className="space-y-5"
        >
          <div>
            <p className="eyebrow">Primer ingreso</p>
            <h2 className="mt-1 font-serif text-3xl text-navy">Cree su contraseña</h2>
            <p className="mt-2 text-sm text-muted">Mínimo 12 caracteres, con mayúsculas, minúsculas y números. No la comparta.</p>
          </div>
          <div>
            <label className="label" htmlFor="npw">Nueva contraseña</label>
            <input id="npw" className="input" type="password" autoComplete="new-password" required value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="npw2">Repetir contraseña</label>
            <input id="npw2" className="input" type="password" autoComplete="new-password" required value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>Guardar y entrar</button>
          <LogoutLink />
        </form>
      )}
      {stage === "consent" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(async () => {
              const { ok, data } = await post("/api/auth/consent", { terms: acceptTerms, dataProcessing: acceptData });
              if (!ok) setError(data.error ?? "No se pudo registrar la autorización.");
              else go("ok");
            });
          }}
          className="space-y-5"
        >
          <div>
            <p className="eyebrow">Antes de continuar</p>
            <h2 className="mt-1 font-serif text-3xl text-navy">Términos y tratamiento de datos</h2>
          </div>
          <div className="rounded-sm border border-navy/15 bg-white p-4 text-sm leading-relaxed text-navy">
            <p>Para su seguridad y la de la información, en este espacio se registran:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>su nombre, correo y organización;</li>
              <li>sus ingresos, los documentos y páginas que consulta y el tiempo de lectura;</li>
              <li>la dirección IP, la ubicación aproximada y el dispositivo que usa.</li>
            </ul>
            <p className="mt-2 text-muted">
              Se usan solo para controlar el acceso y dejar constancia de la consulta. Puede conocer, actualizar o rectificar
              sus datos según la <Link href="/privacidad" target="_blank" className="font-semibold text-navy underline">política de tratamiento de datos</Link>.
            </p>
          </div>
          <label className="flex items-start gap-3 text-sm text-navy">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#1a2744]" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required />
            <span>He leído y acepto los <Link href="/terminos" target="_blank" className="font-semibold underline">Términos de uso</Link>, incluido el compromiso de confidencialidad.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-navy">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#1a2744]" checked={acceptData} onChange={(e) => setAcceptData(e.target.checked)} required />
            <span>Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales conforme a la <Link href="/privacidad" target="_blank" className="font-semibold underline">Política de tratamiento de datos</Link> (Ley 1581 de 2012).</span>
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || !acceptTerms || !acceptData}>Aceptar y entrar</button>
          <LogoutLink />
        </form>
      )}
    </div>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label" htmlFor="code">Código de 6 dígitos</label>
      <input
        id="code" className="input text-center font-mono text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code"
        maxLength={6} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus
      />
    </div>
  );
}

function LogoutLink() {
  return (
    <button
      type="button"
      className="w-full text-center text-xs text-muted underline"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        location.href = "/login";
      }}
    >
      Cancelar y salir
    </button>
  );
}
