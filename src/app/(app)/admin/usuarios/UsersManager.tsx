"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Profile } from "@/lib/auth";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-CO", { hour12: false, dateStyle: "short", timeStyle: "short" }) : "—");

/** Fecha "AAAA-MM-DD" → fin de ese día en la hora local del navegador, en ISO con zona. */
function endOfDayIso(day: string): string | null {
  if (!day) return null;
  const d = new Date(`${day}T23:59:59`);
  return d.toISOString();
}

async function call(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Error");
  return d;
}

export function UsersManager({ profiles, lastLogin, selfId }: { profiles: Profile[]; lastLogin: Record<string, string>; selfId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", fullName: "", organization: "", role: "auditor", until: "" });
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(p: Profile, body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    try {
      const d = await call(`/api/admin/users/${p.id}`, "PATCH", body);
      if (d.tempPassword) setSecret({ email: p.email, password: d.tempPassword });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="card grid gap-3 p-4 md:grid-cols-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const d = await call("/api/admin/users", "POST", {
              email: form.email, fullName: form.fullName, organization: form.organization, role: form.role, accessUntil: endOfDayIso(form.until),
            });
            setSecret({ email: d.email, password: d.tempPassword });
            setForm({ email: "", fullName: "", organization: "", role: "auditor", until: "" });
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="font-serif text-xl text-navy md:col-span-6">Invitar usuario</h2>
        <div className="md:col-span-2"><label className="label" htmlFor="u-email">Correo</label><input id="u-email" required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="u-name">Nombre completo</label><input id="u-name" required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="u-org">Firma / entidad</label><input id="u-org" className="input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="u-role">Rol</label>
          <select id="u-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="auditor">Auditor (solo consulta)</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div className="md:col-span-2"><label className="label" htmlFor="u-until">Acceso hasta (opcional)</label><input id="u-until" type="date" className="input" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} /></div>
        <div className="flex items-end md:col-span-2"><button className="btn-primary w-full" disabled={busy}>{busy ? "Creando…" : "Invitar"}</button></div>
      </form>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {secret && (
        <div className="card border-gold bg-gold/10 p-4" data-testid="temp-password">
          <p className="text-sm text-navy">Contraseña temporal de <strong>{secret.email}</strong> (se muestra una sola vez):</p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded-sm bg-white px-3 py-2 font-mono text-lg tracking-wider text-navy">{secret.password}</code>
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(secret.password)}>Copiar</button>
            <button className="btn-ghost" onClick={() => setSecret(null)}>Ocultar</button>
          </div>
          <p className="mt-2 text-xs text-muted">Entréguela por un canal distinto al del enlace (p. ej. enlace por correo y contraseña por WhatsApp o llamada).</p>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table-audit w-full">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acceso hasta</th><th>Último ingreso</th><th>Acciones</th></tr></thead>
          <tbody>
            {profiles.map((p) => {
              const expired = p.access_until && new Date(p.access_until) <= new Date();
              const self = p.id === selfId;
              return (
                <tr key={p.id} data-email={p.email}>
                  <td>
                    <div className="font-medium text-navy">{p.full_name ?? p.email}</div>
                    <div className="text-muted">{p.email}{p.organization ? ` · ${p.organization}` : ""}</div>
                  </td>
                  <td>
                    <select className="input py-1 text-xs" value={p.role} disabled={self}
                      onChange={(e) => act(p, { action: "set_role", role: e.target.value }, `¿Cambiar el rol de ${p.email} a ${e.target.value}?`)}>
                      <option value="auditor">Auditor</option><option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td>
                    {!p.active ? <span className="badge bg-red-100 text-red-800">Revocado</span>
                      : expired ? <span className="badge bg-amber-100 text-amber-900">Vencido</span>
                      : p.must_change_password ? <span className="badge bg-sky-100 text-sky-900">Pendiente 1er ingreso</span>
                      : <span className="badge bg-emerald-100 text-emerald-800">Activo</span>}
                  </td>
                  <td>
                    <input type="date" className="input py-1 text-xs" disabled={self}
                      defaultValue={p.access_until ? new Date(p.access_until).toLocaleDateString("en-CA") : ""}
                      onBlur={(e) => {
                        const next = endOfDayIso(e.target.value);
                        const prev = p.access_until ? new Date(p.access_until).toLocaleDateString("en-CA") : "";
                        if (e.target.value !== prev) act(p, { action: "set_until", accessUntil: next });
                      }} />
                  </td>
                  <td className="whitespace-nowrap">{fmt(lastLogin[p.id] ?? null)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {!self && (p.active
                        ? <button className="btn-danger px-2 py-1" onClick={() => act(p, { action: "revoke" }, `¿Quitar el acceso a ${p.email}? Se cerrará su sesión en la siguiente acción.`)}>Quitar acceso</button>
                        : <button className="btn-ghost px-2 py-1" onClick={() => act(p, { action: "restore" })}>Restaurar</button>)}
                      <button className="btn-ghost px-2 py-1" onClick={() => act(p, { action: "reset_password" }, `¿Generar una nueva contraseña temporal para ${p.email}?`)}>Nueva contraseña</button>
                      <button className="btn-ghost px-2 py-1" onClick={() => act(p, { action: "reset_mfa" }, `¿Restablecer el 2FA de ${p.email}? Deberá configurarlo de nuevo al entrar.`)}>Restablecer 2FA</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
