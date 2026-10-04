import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { isReceptionMode } from "@/lib/reception";
import { Reception } from "./Reception";

// Se decide en cada visita: la misma compilación sirve de recepción (APP_MODE=recepcion) o de cuarto.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return isReceptionMode() ? { title: "BONNY · Llave y control" } : {};
}

export default async function Home() {
  if (isReceptionMode()) return <Reception />;
  const s = await requirePage();
  redirect(s.profile.role === "admin" ? "/admin" : "/documentos");
}
