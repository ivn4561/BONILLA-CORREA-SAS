import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Recepción BONNY: una sola entrada donde se escribe el código de 6 dígitos del cuarto.
 *
 * - La recepción (APP_MODE=recepcion) conoce los cuartos por RECEPTION_ROOMS y, si el código es correcto,
 *   envía al navegador al cuarto con un pase de entrada firmado y de corta duración.
 * - El cuarto (RECEPTION_SECRET) comprueba ese pase y deja una cookie firmada que habilita su pantalla de ingreso.
 *   Así nadie llega al formulario de un cuarto sin haber escrito su código.
 */

export const ROOM_COOKIE = "dr_room";
export const ENTRY_TTL_MS = 2 * 60_000;
export const ROOM_PASS_TTL_MS = 12 * 60 * 60_000;
export const CODE = /^\d{6}$/;

export function isReceptionMode(): boolean {
  return process.env.APP_MODE?.trim().toLowerCase() === "recepcion";
}

export type GateConfig = { status: "off" } | { status: "invalid" } | { status: "on"; secret: string; url: string };

/**
 * Configuración del cuarto respecto a la recepción.
 * - Sin RECEPTION_SECRET ni RECEPTION_URL: "off" (se entra directo a /login, como siempre).
 * - Con alguna de las dos mal puesta: "invalid". El cuarto NO se abre en silencio: el ingreso queda cerrado
 *   hasta corregirla (mejor un aviso claro que creer que el cuarto está protegido y no lo esté).
 */
export function receptionConfig(e: Record<string, string | undefined> = process.env): GateConfig {
  const secret = e.RECEPTION_SECRET?.trim();
  const url = e.RECEPTION_URL?.trim();
  if (!secret && !url) return { status: "off" };
  if (!secret || secret.length < 32 || !url || !safeUrl(url)) return { status: "invalid" };
  return { status: "on", secret, url };
}

/** Atajo: la recepción activa y bien configurada, o null. */
export function receptionGate(): { secret: string; url: string } | null {
  const c = receptionConfig();
  return c.status === "on" ? { secret: c.secret, url: c.url } : null;
}

function safeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    // http solo para pruebas en el propio equipo
    return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname));
  } catch {
    return false;
  }
}

export type Room = { code: string; url: string; secret: string };

const RoomsSchema = z.array(
  z.object({
    codigo: z.string().regex(CODE),
    url: z.string().refine(safeUrl),
    secreto: z.string().min(32),
  }),
);

/** RECEPTION_ROOMS = [{"codigo":"482731","url":"https://…","secreto":"…"}]. Si es inválido, no hay cuartos. */
export function parseRooms(raw: string | undefined): Room[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = RoomsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    const codes = new Set(parsed.data.map((r) => r.codigo));
    if (codes.size !== parsed.data.length) return []; // códigos repetidos: configuración ambigua
    return parsed.data.map((r) => ({ code: r.codigo, url: new URL(r.url).origin, secret: r.secreto }));
  } catch {
    return [];
  }
}

function equal(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function findRoom(rooms: Room[], code: string): Room | null {
  let found: Room | null = null;
  // Recorre todos para no delatar por tiempo en qué posición está el código.
  for (const r of rooms) if (equal(r.code, code)) found = r;
  return found;
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Pase de entrada que la recepción entrega al navegador: "<vence>.<aleatorio>.<firma>". */
export function createEntryToken(secret: string, now = Date.now()): string {
  const exp = now + ENTRY_TTL_MS;
  const nonce = randomBytes(12).toString("base64url");
  return `${exp}.${nonce}.${sign(secret, `entrar.${exp}.${nonce}`)}`;
}

export function readEntryToken(token: string | null | undefined, secret: string, now = Date.now()): boolean {
  const parts = token?.split(".") ?? [];
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  const vence = Number(exp);
  if (!Number.isFinite(vence) || vence < now || vence > now + ENTRY_TTL_MS + 60_000) return false;
  return equal(sig, sign(secret, `entrar.${exp}.${nonce}`));
}

/** Cookie del cuarto que habilita su pantalla de ingreso: "<vence>.<firma>". */
export function createRoomPass(secret: string, now = Date.now()): string {
  const exp = now + ROOM_PASS_TTL_MS;
  return `${exp}.${sign(secret, `cuarto.${exp}`)}`;
}

export function readRoomPass(value: string | undefined, secret: string, now = Date.now()): boolean {
  const parts = value?.split(".") ?? [];
  if (parts.length !== 2) return false;
  const [exp, sig] = parts;
  const vence = Number(exp);
  if (!Number.isFinite(vence) || vence < now || vence > now + ROOM_PASS_TTL_MS + 60_000) return false;
  return equal(sig, sign(secret, `cuarto.${exp}`));
}

/** Agrupa las IPv6 por su bloque /64 (cada persona suele tener millones de direcciones en el mismo bloque). */
export function limiterKey(ip: string | null): string {
  if (!ip) return "sin-ip";
  if (!ip.includes(":")) return ip;
  return ip.toLowerCase().split(":").slice(0, 4).join(":") + "::/64";
}

/**
 * Límite de intentos fallidos en la recepción, en la memoria del servidor: 5 por IP (o bloque IPv6 /64) cada 15 min.
 * No hay un tope global que bloquee a todos: dejaría sin entrada a los auditores de todos los cuartos.
 * Vercel puede repartir las visitas entre varias instancias, así que es un freno, no una garantía; la seguridad
 * real del cuarto sigue siendo la contraseña y el 2FA.
 */
export class AttemptLimiter {
  private byKey = new Map<string, number[]>();
  constructor(private perKey = 5, private windowMs = 15 * 60_000, private maxKeys = 50_000) {}

  private recent(key: string, now: number): number[] {
    return (this.byKey.get(key) ?? []).filter((t) => t > now - this.windowMs);
  }

  blocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.perKey;
  }

  fail(key: string, now = Date.now()) {
    const list = this.recent(key, now);
    list.push(now);
    this.byKey.delete(key);
    this.byKey.set(key, list); // al final: el Map queda ordenado del menos al más reciente
    // Si hay demasiadas IP, se olvidan las más antiguas (no todas de golpe).
    while (this.byKey.size > this.maxKeys) this.byKey.delete(this.byKey.keys().next().value!);
  }
}
