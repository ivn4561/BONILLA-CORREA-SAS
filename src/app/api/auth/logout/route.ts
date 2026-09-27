import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody } from "@/lib/http";
import { performLogout } from "@/lib/logout";

const Body = z.object({ motivo: z.enum(["manual", "inactividad"]).default("manual") });

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  await performLogout(body.motivo);
  return NextResponse.json({ ok: true });
}
