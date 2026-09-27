import { actionLabel } from "@/lib/actions";
import { formatDateTime } from "@/lib/brand";
import { detailsSummary, locationOf, type AuditRow } from "@/lib/audit-query";

const TONE: Record<string, string> = {
  login_fallido: "bg-red-100 text-red-800", login_bloqueado: "bg-red-100 text-red-800", mfa_fallido: "bg-red-100 text-red-800",
  acceso_denegado: "bg-red-100 text-red-800", acceso_directo_bloqueado: "bg-red-100 text-red-800", intento_copia: "bg-amber-100 text-amber-900",
  login_exitoso: "bg-emerald-100 text-emerald-800", documento_abierto: "bg-sky-100 text-sky-900",
};

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="table-audit w-full" data-testid="audit-table">
        <thead>
          <tr><th>#</th><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Documento</th><th>IP / ubicación</th><th>Navegador / dispositivo</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-action={r.action}>
              <td className="font-mono text-muted" title={`hash ${r.hash}`}>{r.id}</td>
              <td className="whitespace-nowrap">{formatDateTime(r.occurred_at)}</td>
              <td>{r.user_email ?? "—"}{r.user_role && <div className="text-[0.6rem] uppercase text-muted">{r.user_role}</div>}</td>
              <td>
                <span className={`badge ${TONE[r.action] ?? (r.action.startsWith("admin_") ? "bg-navy/10 text-navy" : "bg-cream-2 text-navy")}`}>{actionLabel(r.action)}</span>
                {detailsSummary(r) && <div className="mt-1 text-[0.7rem] text-muted">{detailsSummary(r)}</div>}
              </td>
              <td className="max-w-[16rem] break-words">{r.document_name ?? ""}</td>
              <td className="whitespace-nowrap">{r.ip ?? "—"}<div className="text-[0.7rem] text-muted">{locationOf(r) || "sin ubicación"}</div></td>
              <td>{r.browser ?? "—"}<div className="text-[0.7rem] text-muted">{[r.os, r.device].filter(Boolean).join(" · ")}</div></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted">Sin registros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
