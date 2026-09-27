import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, getProfile, requireApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";
import { tempPassword } from "@/lib/passwords";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("set_until"), accessUntil: z.string().datetime({ offset: true }).nullable() }),
  z.object({ action: z.literal("set_role"), role: z.enum(["admin", "auditor"]) }),
  z.object({ action: z.literal("reset_password") }),
  z.object({ action: z.literal("reset_mfa") }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi({ admin: true });
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const target = await getProfile(id);
  if (!target) return jsonError(404, "Usuario no encontrado.");
  if (id === s.user.id && (body.action === "revoke" || body.action === "set_role" || body.action === "set_until")) {
    return jsonError(400, "No puede cambiar su propio acceso o rol.");
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const base = { actor: actorOf(s), sessionId: s.sessionId };
  const who = { usuario: target.email };
  let result: Record<string, unknown> = { ok: true };

  switch (body.action) {
    case "revoke":
      await db.from("profiles").update({ active: false, updated_at: now }).eq("id", id);
      await db.auth.admin.updateUserById(id, { ban_duration: "876000h" });
      await logEvent({ ...base, action: "admin_acceso_revocado", details: who });
      break;
    case "restore":
      await db.from("profiles").update({ active: true, updated_at: now }).eq("id", id);
      await db.auth.admin.updateUserById(id, { ban_duration: "none" });
      await logEvent({ ...base, action: "admin_acceso_restaurado", details: who });
      break;
    case "set_until":
      await db.from("profiles").update({ access_until: body.accessUntil, updated_at: now }).eq("id", id);
      await logEvent({ ...base, action: "admin_fecha_fin_cambiada", details: { ...who, antes: target.access_until, ahora: body.accessUntil } });
      break;
    case "set_role":
      await db.from("profiles").update({ role: body.role, updated_at: now }).eq("id", id);
      await logEvent({ ...base, action: "admin_rol_cambiado", details: { ...who, antes: target.role, ahora: body.role } });
      break;
    case "reset_password": {
      const password = tempPassword();
      const { error } = await db.auth.admin.updateUserById(id, { password });
      if (error) return jsonError(500, "No se pudo restablecer la contraseña.");
      await db.from("profiles").update({ must_change_password: true, updated_at: now }).eq("id", id);
      await logEvent({ ...base, action: "admin_contrasena_restablecida", details: who });
      result = { ok: true, tempPassword: password };
      break;
    }
    case "reset_mfa": {
      const { data } = await db.auth.admin.mfa.listFactors({ userId: id });
      for (const f of data?.factors ?? []) await db.auth.admin.mfa.deleteFactor({ userId: id, id: f.id });
      await logEvent({ ...base, action: "admin_2fa_restablecido", details: { ...who, factores_eliminados: data?.factors?.length ?? 0 } });
      break;
    }
  }
  return NextResponse.json(result);
}
