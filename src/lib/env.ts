import "server-only";
import { positiveNumber } from "@/lib/env-utils";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const env = {
  get supabaseUrl() { return required("SUPABASE_URL"); },
  get supabaseAnonKey() { return required("SUPABASE_ANON_KEY"); },
  get supabaseServiceKey() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
  get sessionSecret() {
    const s = required("SESSION_SECRET");
    if (s.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres");
    return s;
  },
  get idleMinutes() { return positiveNumber(process.env.IDLE_TIMEOUT_MINUTES, 15); },
  get requireMfa() { return process.env.REQUIRE_MFA?.trim() !== "false"; },
  get docsSource() { return (process.env.DOCS_SOURCE?.trim() === "local" ? "local" : "drive") as "drive" | "local"; },
  get driveRootFolderId() { return required("DRIVE_ROOT_FOLDER_ID"); },
  get googleServiceAccount() {
    // Acepta el JSON pegado tal cual (GOOGLE_SERVICE_ACCOUNT_JSON) o codificado en base64.
    const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? required("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64")).trim();
    const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(text) as { client_email: string; private_key: string };
  },
  get localDocsDir() { return process.env.LOCAL_DOCS_DIR?.trim() || "./demo-docs"; },
  get geoFallback() { return process.env.GEO_FALLBACK?.trim() || "ipapi"; },
};
