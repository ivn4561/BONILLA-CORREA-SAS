import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, requireApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";
import { tempPassword } from "@/lib/passwords";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(120).optional().default(""),
  role: z.enum(["admin", "auditor"]),
  accessUntil: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi({ admin: true });
  if (s instanceof NextResponse) return s;

  const db = supabaseAdmin();
  const password = tempPassword();
  const { data, error } = await db.auth.admin.createUser({ email: body.email, password, email_confirm: true });
  if (error || !data.user) {
    const exists = error?.code === "email_exists" || /already/i.test(error?.message ?? "");
    return jsonError(exists ? 409 : 500, exists ? "Ya existe un usuario con ese correo." : "No se pudo crear el usuario.");
  }
  const { error: pErr } = await db.from("profiles").insert({
    id: data.user.id,
    email: body.email,
    full_name: body.fullName,
    organization: body.organization || null,
    role: body.role,
    access_until: body.accessUntil ?? null,
    must_change_password: true,
    created_by: s.user.id,
  });
  if (pErr) {
    await db.auth.admin.deleteUser(data.user.id);
    return jsonError(500, "No se pudo crear el perfil.");
  }
  await logEvent({
    action: "admin_usuario_creado",
    actor: actorOf(s),
    sessionId: s.sessionId,
    details: { usuario: body.email, nombre: body.fullName, organizacion: body.organization, rol: body.role, acceso_hasta: body.accessUntil ?? null },
  });
  return NextResponse.json({ id: data.user.id, email: body.email, tempPassword: password });
}
