import { requirePage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { DocumentRow } from "@/lib/docs";
import { DocsManager } from "./DocsManager";

export default async function AdminDocumentosPage() {
  await requirePage({ admin: true });
  const { data } = await supabaseAdmin().from("documents").select("*").eq("removed", false).order("folder_path").order("name");
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administración</p>
        <h1 className="mt-1 font-serif text-4xl text-navy">Gestión de documentos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Los archivos se suben directamente a la carpeta {env.docsSource === "drive" ? "de Google Drive" : "local"} configurada (la aplicación solo tiene permiso de lectura).
          Pulse «Sincronizar» para detectar cambios y elija qué documentos ven los auditores. Todo queda registrado.
        </p>
      </div>
      <DocsManager docs={(data ?? []) as DocumentRow[]} />
    </div>
  );
}
