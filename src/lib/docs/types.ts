export type SourceFile = {
  id: string;
  name: string;
  folderPath: string;
  mimeType: string;
  size: number | null;
  modifiedAt: string | null;
};

export type ByteRange = { start: number; end: number };

export interface DocSource {
  /** Recorre la carpeta raíz y todas sus subcarpetas. */
  listAll(): Promise<SourceFile[]>;
  /** Tamaño del archivo en bytes. */
  size(id: string): Promise<number>;
  /** Bytes del archivo (completo o un rango inclusivo). */
  read(id: string, range?: ByteRange): Promise<Buffer>;
  /** Exporta a PDF un documento nativo de Google (Docs/Sheets/Slides). */
  exportPdf(id: string): Promise<Buffer>;
}

export const GOOGLE_NATIVE = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
]);

export type ViewKind = "pdf" | "image" | "docx" | "xlsx" | "text" | "unsupported";

export function viewKind(mimeType: string): ViewKind {
  if (mimeType === "application/pdf" || GOOGLE_NATIVE.has(mimeType)) return "pdf";
  if (/^image\/(png|jpe?g|gif|webp|bmp)$/.test(mimeType)) return "image";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  if (mimeType === "text/plain" || mimeType === "text/csv") return "text";
  return "unsupported";
}

export function kindLabel(mimeType: string): string {
  if (GOOGLE_NATIVE.has(mimeType)) {
    return { "application/vnd.google-apps.document": "Google Docs", "application/vnd.google-apps.spreadsheet": "Google Sheets", "application/vnd.google-apps.presentation": "Google Slides" }[mimeType]!;
  }
  return { pdf: "PDF", image: "Imagen", docx: "Word", xlsx: "Excel", text: "Texto", unsupported: "No compatible" }[viewKind(mimeType)];
}
