import { describe, expect, it } from "vitest";
import { createActivityValue, readActivityValue } from "@/lib/session-cookie";
import { sanitizeHtml, escapeHtml } from "@/lib/convert";
import { toCsv } from "@/lib/export";
import { zonedDayStart, type AuditRow } from "@/lib/audit-query";
import { tempPassword } from "@/lib/passwords";
import { validatePassword } from "@/lib/login-flow";
import { viewKind } from "@/lib/docs/types";
import { positiveNumber } from "@/lib/env-utils";

const SECRET = "x".repeat(40);

describe("cookie de actividad", () => {
  it("acepta un valor firmado correctamente", () => {
    const v = createActivityValue("user-1", SECRET, "sid-1", 1000);
    expect(readActivityValue(v, SECRET)).toEqual({ sid: "sid-1", uid: "user-1", at: 1000 });
  });
  it("rechaza un valor manipulado (p. ej. para alargar la sesión)", () => {
    const v = createActivityValue("user-1", SECRET, "sid-1", 1000);
    const tampered = v.replace(".1000.", `.${Date.now()}.`);
    expect(readActivityValue(tampered, SECRET)).toBeNull();
    expect(readActivityValue(v, "y".repeat(40))).toBeNull();
    expect(readActivityValue("basura", SECRET)).toBeNull();
  });
});

describe("HTML de Word", () => {
  it("elimina scripts, manejadores y enlaces", () => {
    const out = sanitizeHtml('<p onclick="alert(1)">hola</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="data:image/png;base64,AA" onerror=alert(1)>');
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain("hola");
  });
  it("escapa texto", () => expect(escapeHtml("<b>&\"'")).toBe("&lt;b&gt;&amp;&quot;&#39;"));
});

describe("exportación CSV", () => {
  const row = (over: Partial<AuditRow>): AuditRow => ({
    id: 1, occurred_at: "2026-09-27T12:00:00.000Z", user_id: null, user_email: "a@b.co", user_role: "auditor", action: "documento_abierto",
    document_id: "d1", document_name: "Doc", details: {}, ip: "1.1.1.1", city: "Bogotá", region: "DC", country: "CO", user_agent: "UA",
    browser: "Chrome", os: "Windows", device: "desktop", session_id: "s", prev_hash: "0".repeat(64), hash: "f".repeat(64), ...over,
  });
  it("neutraliza fórmulas de Excel (inyección CSV)", () => {
    const csv = toCsv([row({ document_name: "=HYPERLINK(\"http://x\")" })]);
    expect(csv).toContain("'=HYPERLINK");
  });
  it("incluye BOM, hora local y hashes", () => {
    const csv = toCsv([row({})]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("27/09/2026, 07:00:00");
    expect(csv).toContain("f".repeat(64));
  });
});

describe("zona horaria", () => {
  it("00:00 en Bogotá son las 05:00 UTC", () => {
    expect(zonedDayStart("2026-09-27", "America/Bogota")!.toISOString()).toBe("2026-09-27T05:00:00.000Z");
  });
  it("rechaza fechas inválidas", () => expect(zonedDayStart("27/09/2026")).toBeNull());
});

describe("contraseñas", () => {
  it("las temporales cumplen la política", () => {
    for (let i = 0; i < 50; i++) expect(validatePassword(tempPassword())).toBeNull();
  });
  it("rechaza contraseñas débiles", () => {
    expect(validatePassword("corta1A")).not.toBeNull();
    expect(validatePassword("todominusculas123")).not.toBeNull();
  });
});

describe("tipos de archivo", () => {
  it("clasifica los formatos soportados", () => {
    expect(viewKind("application/pdf")).toBe("pdf");
    expect(viewKind("application/vnd.google-apps.document")).toBe("pdf");
    expect(viewKind("image/svg+xml")).toBe("unsupported"); // SVG puede contener scripts
    expect(viewKind("application/msword")).toBe("unsupported");
  });
});

describe("variables de entorno", () => {
  it("una variable vacía usa el valor por defecto (no cierra la sesión al instante)", () => {
    expect(positiveNumber("", 15)).toBe(15);
    expect(positiveNumber("   ", 15)).toBe(15);
    expect(positiveNumber(undefined, 15)).toBe(15);
    expect(positiveNumber("abc", 15)).toBe(15);
    expect(positiveNumber("0", 15)).toBe(15);
    expect(positiveNumber("30", 15)).toBe(30);
  });
});
