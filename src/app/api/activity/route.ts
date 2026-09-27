import { NextResponse } from "next/server";

// El proxy renueva la cookie de actividad en cada petición; esta ruta solo sirve de "ping".
export async function POST() {
  return NextResponse.json({ ok: true });
}
