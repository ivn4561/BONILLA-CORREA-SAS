import "server-only";
import { google, type drive_v3 } from "googleapis";
import { env } from "@/lib/env";
import type { ByteRange, DocSource, SourceFile } from "./types";

const FOLDER = "application/vnd.google-apps.folder";

export class DriveSource implements DocSource {
  private drive: drive_v3.Drive;

  constructor() {
    const sa = env.googleServiceAccount;
    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"], // solo lectura
    });
    this.drive = google.drive({ version: "v3", auth });
  }

  async listAll(): Promise<SourceFile[]> {
    const out: SourceFile[] = [];
    const queue: { id: string; path: string }[] = [{ id: env.driveRootFolderId, path: "" }];
    while (queue.length) {
      const folder = queue.shift()!;
      let pageToken: string | undefined;
      do {
        const res = await this.drive.files.list({
          q: `'${folder.id}' in parents and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        for (const f of res.data.files ?? []) {
          if (!f.id || !f.name || !f.mimeType) continue;
          if (f.mimeType === FOLDER) {
            queue.push({ id: f.id, path: folder.path ? `${folder.path}/${f.name}` : f.name });
          } else if (f.mimeType !== "application/vnd.google-apps.shortcut") {
            out.push({
              id: f.id,
              name: f.name,
              folderPath: folder.path,
              mimeType: f.mimeType,
              size: f.size ? Number(f.size) : null,
              modifiedAt: f.modifiedTime ?? null,
            });
          }
        }
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
    }
    return out;
  }

  async size(id: string): Promise<number> {
    const res = await this.drive.files.get({ fileId: id, fields: "size", supportsAllDrives: true });
    return Number(res.data.size ?? 0);
  }

  async read(id: string, range?: ByteRange): Promise<Buffer> {
    const res = await this.drive.files.get(
      { fileId: id, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer", headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {} },
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  async exportPdf(id: string): Promise<Buffer> {
    const res = await this.drive.files.export({ fileId: id, mimeType: "application/pdf" }, { responseType: "arraybuffer" });
    return Buffer.from(res.data as ArrayBuffer);
  }
}
