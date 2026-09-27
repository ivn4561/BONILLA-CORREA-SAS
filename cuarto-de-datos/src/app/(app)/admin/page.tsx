import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hoursAgoIso, queryAudit } from "@/lib/audit-query";
import { AuditTable } from "@/components/AuditTable";
import { VerifyButton } from "@/components/VerifyButton";

export default async function AdminHome() {
  await requirePage({ admin: true });
  const db = supabaseAdmin();
  const since = hoursAgoIso(24);
  const head = (table: string) => db.from(table).select("*", { count: "exact", head: true });
  const alerts = ["login_fallido", "mfa_fallido", "login_bloqueado", "acceso_directo_bloqueado", "intento_copia"];
  const results = await Promise.all([
    head("profiles").eq("active", true),
    head("documents").eq("visible", true).eq("removed", false),
    head("audit_log").eq("action", "documento_abierto").gte("occurred_at", since),
    head("audit_log").gte("occurred_at", since),
    head("audit_log").in("action", alerts).gte("occurred_at", since),
  ]);
  const [users, docs, opens, events, fails] = results.map((r) => r.count ?? 0);
  const { rows } = await queryAudit({}, { limit: 12, offset: 0 });
  const stats = [
    { label: "Usuarios activos", value: users, href: "/admin/usuarios" },
    { label: "Documentos publicados", value: docs, href: "/admin/documentos" },
    { label: "Aperturas (24 h)", value: opens, href: "/admin/actividad?action=documento_abierto" },
    { label: "Eventos (24 h)", value: events, href: "/admin/actividad" },
    { label: "Alertas (24 h)", value: fails, href: "/admin/actividad", alert: fails > 0 },
  ];
  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Administración</p>
        <h1 className="mt-1 font-serif text-4xl text-navy">Resumen</h1>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-gold">
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">{s.label}</div>
            <div className={`mt-2 font-serif text-4xl ${s.alert ? "text-red-700" : "text-navy"}`}>{s.value}</div>
          </Link>
        ))}
      </div>
      <VerifyButton />
      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-navy">Actividad reciente</h2>
          <Link href="/admin/actividad" className="text-xs font-semibold uppercase tracking-wider text-gold">Ver todo →</Link>
        </div>
        <AuditTable rows={rows} />
      </div>
    </div>
  );
}
