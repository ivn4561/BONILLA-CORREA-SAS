import "server-only";

// Caché pequeña en memoria para PDFs exportados desde Google Docs/Sheets (se piden por rangos).
const MAX_ITEMS = 8;
const TTL_MS = 10 * 60_000;
const cache = new Map<string, { buf: Buffer; at: number }>();

export async function cachedExport(id: string, load: () => Promise<Buffer>): Promise<Buffer> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.buf;
  const buf = await load();
  cache.set(id, { buf, at: Date.now() });
  while (cache.size > MAX_ITEMS) cache.delete(cache.keys().next().value!);
  return buf;
}
