import { requirePage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DocumentRow } from "@/lib/docs";
import { DocumentList } from "./DocumentList";

export default async function DocumentosPage() {
  await requirePage();
  const { data } = await supabaseAdmin()
    .from("documents").select("id, name, folder_path, mime_type, size_bytes, modified_at")
    .eq("visible", true).eq("removed", false).order("folder_path").order("name");
  const docs = (data ?? []) as Pick<DocumentRow, "id" | "name" | "folder_path" | "mime_type" | "size_bytes" | "modified_at">[];
  return (
    <div>
      <p className="eyebrow">Consulta</p>
      <h1 className="mt-1 font-serif text-4xl text-navy">Documentos</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Documentos de solo lectura. Cada apertura, página consultada y tiempo de visualización quedan registrados.</p>
      <DocumentList docs={docs} />
    </div>
  );
}
