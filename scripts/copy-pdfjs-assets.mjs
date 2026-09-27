// Copia el worker y los recursos de pdf.js a /public/pdfjs para servirlos desde el mismo origen.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let root;
try {
  root = dirname(require.resolve("pdfjs-dist/package.json"));
} catch {
  console.warn("pdfjs-dist no instalado todavía; se omite la copia.");
  process.exit(0);
}
const out = join(process.cwd(), "public", "pdfjs");
mkdirSync(out, { recursive: true });
// Build "legacy": compatible con navegadores sin las últimas funciones de JavaScript.
cpSync(join(root, "legacy", "build", "pdf.worker.min.mjs"), join(out, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  const src = join(root, dir);
  if (existsSync(src)) cpSync(src, join(out, dir), { recursive: true });
}
console.log("Recursos de pdf.js copiados a public/pdfjs");
