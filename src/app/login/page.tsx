import { Suspense } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { LoginFlow } from "./LoginFlow";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <BrandMark light />
        <div className="relative max-w-md">
          <p className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">Acceso restringido</p>
          <h1 className="font-serif text-5xl font-light leading-tight">
            Documentación confidencial, <em className="text-gold-2">bajo registro</em>.
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            <li>— Solo usuarios invitados, con verificación en dos pasos.</li>
            <li>— Documentos de solo lectura con marca de agua personal.</li>
            <li>— Cada acción queda en un registro inalterable y verificable.</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/60">El uso de este espacio implica la aceptación del registro de su actividad (IP, ubicación aproximada, dispositivo y acciones).</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <Suspense>
            <LoginFlow />
          </Suspense>
          <p className="mt-10 border-t border-navy/10 pt-4 text-xs leading-relaxed text-muted">
            Este sitio usa solo cookies esenciales para mantener su sesión segura; no usa cookies de publicidad ni de analítica.{" "}
            <Link href="/privacidad#cookies" className="underline">Más información</Link>
            <span className="mt-2 block">
              <Link href="/privacidad" className="underline">Política de tratamiento de datos</Link>{" · "}
              <Link href="/terminos" className="underline">Términos de uso</Link>
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}
