import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent, type Actor } from "@/lib/audit";
import { docSource, type DocumentRow } from "./index";

/** Compara el origen (Drive) con la tabla documents y registra altas y bajas. */
export async function syncDocuments(actor: Actor | null) {
  const db = supabaseAdmin();
  const files = await docSource().listAll();
  const { data: existing, error } = await db.from("documents").select("*");
  if (error) throw error;
  const known = new Map((existing as DocumentRow[]).map((d) => [d.id, d]));
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const added: string[] = [];

  for (const f of files) {
    seen.add(f.id);
    const prev = known.get(f.id);
    const row = {
      id: f.id,
      name: f.name,
      folder_path: f.folderPath,
      mime_type: f.mimeType,
      size_bytes: f.size,
      modified_at: f.modifiedAt,
      removed: false,
      last_seen_at: now,
    };
    const { error: upErr } = await db.from("documents").upsert(row);
    if (upErr) throw upErr;
    if (!prev || prev.removed) {
      added.push(f.id);
      await logEvent({
        action: "documento_detectado",
        actor,
        documentId: f.id,
        documentName: `${f.folderPath ? f.folderPath + "/" : ""}${f.name}`,
        details: { tipo: f.mimeType, tamano_bytes: f.size, modificado_en_origen: f.modifiedAt },
      });
    }
  }

  const removed: string[] = [];
  for (const d of known.values()) {
    if (!seen.has(d.id) && !d.removed) {
      removed.push(d.id);
      await db.from("documents").update({ removed: true, visible: false }).eq("id", d.id);
      await logEvent({
        action: "documento_retirado_origen",
        actor,
        documentId: d.id,
        documentName: `${d.folder_path ? d.folder_path + "/" : ""}${d.name}`,
      });
    }
  }

  await logEvent({
    action: "documentos_sincronizados",
    actor,
    details: { total_en_origen: files.length, nuevos: added.length, retirados: removed.length },
  });
  return { total: files.length, added: added.length, removed: removed.length };
}
