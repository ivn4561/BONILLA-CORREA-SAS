import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth";

export default async function Home() {
  const s = await requirePage();
  redirect(s.profile.role === "admin" ? "/admin" : "/documentos");
}
