import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { ACTION_LABELS } from "@/lib/actions";
import { APP_TIMEZONE } from "@/lib/brand";
import { filtersFromParams, queryAudit } from "@/lib/audit-query";
import { AuditTable } from "@/components/AuditTable";
import { VerifyButton } from "@/components/VerifyButton";

const PAGE = 50;

export default async function ActividadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePage({ admin: true });
  const sp = await searchParams;
  const filters = filtersFromParams(sp);
  const p = Math.max(1, Number(sp.p ?? 1) || 1);
  const { rows, total } = await queryAudit(filters, { limit: PAGE, offset: (p - 1) * PAGE });
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (n: number) => `/admin/actividad?${new URLSearchParams({ ...Object.fromEntries(qs), p: String(n) })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Registro inalterable</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">Actividad</h1>
          <p className="mt-1 text-xs text-muted">Horas en {APP_TIMEZONE}. {total} registros con los filtros actuales.</p>
        </div>
        <div className="flex gap-2">
          <a className="btn-ghost" href={`/api/admin/export?format=csv&${qs}`}>Exportar CSV</a>
          <a className="btn-primary" href={`/api/admin/export?format=pdf&${qs}`}>Exportar PDF</a>
        </div>
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-6" method="get">
        <div className="md:col-span-2"><label className="label" htmlFor="user">Usuario (correo)</label><input id="user" name="user" className="input" defaultValue={filters.user} /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="document">Documento</label><input id="document" name="document" className="input" defaultValue={filters.document} /></div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="action">Acción</label>
          <select id="action" name="action" className="input" defaultValue={filters.action ?? ""}>
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="md:col-span-2"><label className="label" htmlFor="from">Desde</label><input id="from" type="date" name="from" className="input" defaultValue={filters.from} /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="to">Hasta</label><input id="to" type="date" name="to" className="input" defaultValue={filters.to} /></div>
        <div className="flex items-end gap-2 md:col-span-2">
          <button className="btn-primary flex-1">Filtrar</button>
          <Link href="/admin/actividad" className="btn-ghost">Limpiar</Link>
        </div>
      </form>

      <VerifyButton />
      <AuditTable rows={rows} />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>Página {p} de {pages}</span>
        <div className="flex gap-2">
          {p > 1 && <Link className="btn-ghost" href={link(p - 1)}>← Anterior</Link>}
          {p < pages && <Link className="btn-ghost" href={link(p + 1)}>Siguiente →</Link>}
        </div>
      </div>
    </div>
  );
}
