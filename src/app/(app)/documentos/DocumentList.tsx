"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { kindLabel } from "@/lib/docs/types";

type Doc = { id: string; name: string; folder_path: string; mime_type: string; size_bytes: number | null; modified_at: string | null };

export function formatBytes(n: number | null) {
  if (n === null || n === undefined) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export function DocumentList({ docs }: { docs: Doc[] }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, Doc[]>();
    for (const d of docs) {
      if (needle && !`${d.folder_path} ${d.name}`.toLowerCase().includes(needle)) continue;
      const k = d.folder_path || "General";
      map.set(k, [...(map.get(k) ?? []), d]);
    }
    return [...map.entries()];
  }, [docs, q]);

  return (
    <div className="mt-8">
      <input className="input max-w-md" placeholder="Buscar por nombre o tema…" value={q} onChange={(e) => setQ(e.target.value)} />
      {groups.length === 0 && <p className="mt-8 text-sm text-muted">{docs.length ? "Sin resultados." : "Todavía no hay documentos publicados."}</p>}
      <div className="mt-6 space-y-8">
        {groups.map(([folder, items]) => (
          <section key={folder}>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-navy">
              <span className="text-gold" aria-hidden>▸</span> {folder.split("/").join(" / ")}
              <span className="font-normal text-muted">({items.length})</span>
            </h2>
            <ul className="card divide-y divide-navy/5">
              {items.map((d) => (
                <li key={d.id}>
                  <Link href={`/visor/${encodeURIComponent(d.id)}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-cream">
                    <span className="flex items-center gap-3">
                      <FileIcon mime={d.mime_type} />
                      <span className="text-sm text-navy">{d.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-4 text-xs text-muted">
                      <span className="hidden sm:inline">{kindLabel(d.mime_type)}</span>
                      <span className="hidden w-16 text-right sm:inline">{formatBytes(d.size_bytes)}</span>
                      <span className="font-semibold text-gold-ink">Ver →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function FileIcon({ mime }: { mime: string }) {
  const label = kindLabel(mime);
  const color = label === "PDF" ? "bg-red-700" : label.includes("Word") || label.includes("Docs") ? "bg-blue-700" : label.includes("Excel") || label.includes("Sheets") ? "bg-green-700" : label === "Imagen" ? "bg-amber-600" : "bg-slate-500";
  return <span className={`inline-flex h-7 w-7 items-center justify-center rounded-sm text-[0.55rem] font-bold text-white ${color}`}>{label.slice(0, 3).toUpperCase()}</span>;
}
