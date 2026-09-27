import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/auth";
import { brand } from "@/lib/brand";

export async function GET() {
  const s = await getSessionState();
  return NextResponse.json({
    stage: s.stage,
    email: s.user?.email ?? null,
    role: s.profile?.role ?? null,
    deniedReason: s.deniedReason ?? null,
    org: brand.orgName,
  });
}
