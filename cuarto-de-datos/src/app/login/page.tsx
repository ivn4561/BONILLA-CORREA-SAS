import { Suspense } from "react";
import { BrandMark } from "@/components/Brand";
import { LoginFlow } from "./LoginFlow";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <BrandMark light />
        <div className="relative max-w-md">
          <p className="eyebrow mb-4">Acceso restringido</p>
          <h1 className="font-serif text-5xl font-light leading-tight">
            Documentación confidencial, <em className="text-gold-2">bajo registro</em>.
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            <li>— Solo usuarios invitados, con verificación en dos pasos.</li>
            <li>— Documentos de solo lectura con marca de agua personal.</li>
            <li>— Cada acción queda en un registro inalterable y verificable.</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/40">El uso de este espacio implica la aceptación del registro de su actividad (IP, ubicación aproximada, dispositivo y acciones).</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <Suspense>
            <LoginFlow />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
