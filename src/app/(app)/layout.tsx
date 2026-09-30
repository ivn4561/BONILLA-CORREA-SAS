import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { env } from "@/lib/env";
import { BrandMark } from "@/components/Brand";
import { IdleGuard } from "@/components/IdleGuard";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLink } from "@/components/NavLink";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePage();
  const isAdmin = s.profile.role === "admin";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 px-4 sm:px-6">
          <div className="py-3"><BrandMark light /></div>
          <nav className="flex gap-5">
            <NavLink href="/documentos">Documentos</NavLink>
            {isAdmin && <NavLink href="/admin" exact>Resumen</NavLink>}
            {isAdmin && <NavLink href="/admin/actividad">Actividad</NavLink>}
            {isAdmin && <NavLink href="/admin/usuarios">Usuarios</NavLink>}
            {isAdmin && <NavLink href="/admin/documentos">Gestión de documentos</NavLink>}
          </nav>
          <div className="flex items-center gap-4 py-3">
            <div className="text-right leading-tight">
              <div className="text-xs text-white">{s.user.email}</div>
              <div className="text-[0.6rem] uppercase tracking-widest text-gold">{isAdmin ? "Administrador" : "Auditor"}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-navy/10 py-4 text-center text-[0.65rem] text-muted">
        Toda la actividad en este espacio queda registrada (usuario, fecha y hora, IP, ubicación aproximada y dispositivo).{" "}
        <Link href="/privacidad" className="underline">Política de tratamiento de datos</Link>{" · "}
        <Link href="/terminos" className="underline">Términos de uso</Link>
      </footer>
      <IdleGuard idleMinutes={env.idleMinutes} />
    </div>
  );
}
