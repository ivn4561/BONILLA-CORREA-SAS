"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DocumentRow } from "@/lib/docs";
import { kindLabel, viewKind } from "@/lib/docs/types";
import { formatBytes } from "../../documentos/DocumentList";

export function DocsManager({ docs }: { docs: DocumentRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, DocumentRow[]>();
    for (const d of docs) m.set(d.folder_path || "General", [...(m.get(d.folder_path || "General") ?? []), d]);
    return [...m.entries()];
  }, [docs]);

  async function toggle(d: DocumentRow, visible: boolean) {
    const r = await fetch(`/api/admin/documents/${encodeURIComponent(d.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visible }) });
    if (!r.ok) setMsg((await r.json()).error ?? "Error");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            const r = await fetch("/api/admin/documents/sync", { method: "POST" });
            const d = await r.json();
            setMsg(r.ok ? `Sincronizado: ${d.total} archivos en origen, ${d.added} nuevos, ${d.removed} retirados.` : d.error);
            setBusy(false);
            router.refresh();
          }}
        >
          {busy ? "Sincronizando…" : "Sincronizar"}
        </button>
        {msg && <span className="text-sm text-navy" data-testid="sync-msg">{msg}</span>}
      </div>

      {groups.length === 0 && <p className="text-sm text-muted">No hay documentos. Suba archivos a la carpeta y pulse «Sincronizar».</p>}

      {groups.map(([folder, items]) => (
        <section key={folder}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-navy"><span className="text-gold-line" aria-hidden>▸</span> {folder.split("/").join(" / ")}</h2>
            <div className="flex gap-2">
              <button className="btn-ghost px-2 py-1" onClick={async () => { for (const d of items) if (!d.visible && viewKind(d.mime_type) !== "unsupported") await toggle(d, true); router.refresh(); }}>Publicar carpeta</button>
              <button className="btn-ghost px-2 py-1" onClick={async () => { for (const d of items) if (d.visible) await toggle(d, false); router.refresh(); }}>Ocultar carpeta</button>
            </div>
          </div>
          <ul className="card divide-y divide-navy/5">
            {items.map((d) => {
              const unsupported = viewKind(d.mime_type) === "unsupported";
              return (
                <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3" data-doc={d.name}>
                  <div>
                    <div className="text-sm text-navy">{d.name}</div>
                    <div className="text-xs text-muted">{kindLabel(d.mime_type)} · {formatBytes(d.size_bytes)}{unsupported && " · convierta a PDF para poder mostrarlo"}</div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input type="checkbox" className="h-4 w-4 accent-[#c9a84c]" checked={d.visible} disabled={unsupported}
                      onChange={async (e) => { await toggle(d, e.target.checked); router.refresh(); }} />
                    {d.visible ? "Visible" : "Oculto"}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
