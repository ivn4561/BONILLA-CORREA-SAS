import "server-only";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DriveSource } from "./drive";
import { LocalSource } from "./local";
import type { DocSource } from "./types";

let source: DocSource | null = null;
export function docSource(): DocSource {
  source ??= env.docsSource === "local" ? new LocalSource() : new DriveSource();
  return source;
}

export type DocumentRow = {
  id: string;
  name: string;
  folder_path: string;
  mime_type: string;
  size_bytes: number | null;
  modified_at: string | null;
  visible: boolean;
  removed: boolean;
  first_seen_at: string;
  last_seen_at: string;
};

/** Solo se sirven documentos registrados, visibles y presentes en el origen. */
export async function getViewableDocument(id: string): Promise<DocumentRow | null> {
  const { data } = await supabaseAdmin()
    .from("documents").select("*").eq("id", id).eq("visible", true).eq("removed", false).maybeSingle();
  return (data as DocumentRow | null) ?? null;
}
