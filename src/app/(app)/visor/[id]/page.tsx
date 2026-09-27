import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { getViewableDocument } from "@/lib/docs";
import { viewKind } from "@/lib/docs/types";
import { Viewer } from "./Viewer";

export default async function VisorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage();
  const { id } = await params;
  const doc = await getViewableDocument(decodeURIComponent(id));
  if (!doc) notFound();
  return (
    <div>
      <Link href="/documentos" className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-navy">← Documentos</Link>
      <div className="mt-2 mb-4">
        <p className="eyebrow">{doc.folder_path.split("/").join(" / ") || "General"}</p>
        <h1 className="font-serif text-3xl text-navy">{doc.name}</h1>
      </div>
      <Viewer documentId={doc.id} kind={viewKind(doc.mime_type)} shield={process.env.SCREEN_SHIELD !== "false"} />
    </div>
  );
}
