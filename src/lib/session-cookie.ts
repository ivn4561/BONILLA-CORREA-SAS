import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Cookie firmada de actividad: "<sid>.<uid>.<ultimaActividadMs>.<firma>".
 * Permite al servidor cerrar la sesión por inactividad aunque el navegador no colabore.
 */
export const ACTIVITY_COOKIE = "dr_act";

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createActivityValue(uid: string, secret: string, sid: string = randomUUID(), at = Date.now()) {
  const payload = `${sid}.${uid}.${at}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readActivityValue(value: string | undefined, secret: string) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [sid, uid, at, sig] = parts;
  const expected = Buffer.from(sign(`${sid}.${uid}.${at}`, secret));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return { sid, uid, at: Number(at) };
}

export const activityCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};
