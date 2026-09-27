import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/auth";

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Valida origen y cuerpo JSON de una petición que cambia estado. */
export async function readBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | NextResponse> {
  if (!sameOrigin(req)) return jsonError(403, "origen_no_permitido");
  let raw: unknown;
  try {
    const text = await req.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return jsonError(400, "json_invalido");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError(400, "datos_invalidos", { detalle: parsed.error.issues.map((i) => i.message) });
  return parsed.data;
}
