import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { clientIp } from "@/lib/request-context";
import { AttemptLimiter, CODE, createEntryToken, findRoom, isReceptionMode, limiterKey, parseRooms } from "@/lib/reception";

const Body = z.object({ codigo: z.string().trim().regex(CODE) });
const limiter = new AttemptLimiter();
const DELAY_MS = 400;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Recepción: comprueba el código del cuarto y devuelve a dónde ir, con un pase de entrada firmado. */
export async function POST(req: Request) {
  if (!isReceptionMode()) return jsonError(404, "no_encontrado");
  const started = Date.now();
  const ip = limiterKey(clientIp(req.headers));
  // Misma demora en todas las respuestas: frena a quien prueba códigos y no delata cuál acertó.
  const answer = async (res: NextResponse) => {
    await wait(Math.max(0, DELAY_MS - (Date.now() - started)));
    return res;
  };

  if (limiter.blocked(ip)) {
    console.warn(`recepcion: bloqueado ip=${ip}`);
    return answer(jsonError(429, "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo."));
  }

  const body = await readBody(req, Body);
  if (body instanceof NextResponse) {
    if (body.status === 400) limiter.fail(ip);
    return answer(body.status === 400 ? jsonError(400, "Escriba los 6 dígitos del código.") : body);
  }

  const room = findRoom(parseRooms(process.env.RECEPTION_ROOMS), body.codigo);
  if (!room) {
    limiter.fail(ip);
    console.warn(`recepcion: codigo_invalido ip=${ip}`);
    return answer(jsonError(401, "Código no válido. Revíselo con la empresa que lo invitó."));
  }
  return answer(NextResponse.json({ destino: `${room.url}/entrar?t=${encodeURIComponent(createEntryToken(room.secret))}` }));
}
