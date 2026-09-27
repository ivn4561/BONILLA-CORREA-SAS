import "server-only";
import { open, readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { env } from "@/lib/env";
import type { ByteRange, DocSource, SourceFile } from "./types";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".csv": "text/csv",
};

/** Fuente local para desarrollo y demostraciones. El id es la ruta relativa en base64url. */
export class LocalSource implements DocSource {
  private root = resolve(env.localDocsDir);

  private pathOf(id: string): string {
    const rel = Buffer.from(id, "base64url").toString("utf8");
    const full = resolve(this.root, rel);
    if (!full.startsWith(this.root + sep)) throw new Error("Ruta fuera de la carpeta raíz");
    return full;
  }

  async listAll(): Promise<SourceFile[]> {
    const out: SourceFile[] = [];
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else {
          const rel = relative(this.root, full);
          const st = await stat(full);
          const folder = relative(this.root, dir).split(sep).join("/");
          out.push({
            id: Buffer.from(rel).toString("base64url"),
            name: entry.name,
            folderPath: folder,
            mimeType: MIME[extname(entry.name).toLowerCase()] ?? "application/octet-stream",
            size: st.size,
            modifiedAt: st.mtime.toISOString(),
          });
        }
      }
    };
    await walk(this.root);
    return out;
  }

  async size(id: string) {
    return (await stat(this.pathOf(id))).size;
  }

  async read(id: string, range?: ByteRange) {
    const path = this.pathOf(id);
    if (!range) return readFile(path);
    const fh = await open(path, "r");
    try {
      const buf = Buffer.alloc(range.end - range.start + 1);
      const { bytesRead } = await fh.read(buf, 0, buf.length, range.start);
      return buf.subarray(0, bytesRead);
    } finally {
      await fh.close();
    }
  }

  async exportPdf(): Promise<Buffer> {
    throw new Error("La fuente local no exporta documentos de Google");
  }
}
