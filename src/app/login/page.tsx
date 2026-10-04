import { Suspense } from "react";
import Link from "next/link";
import { BonnyMark } from "@/components/Brand";
import { brand } from "@/lib/brand";
import { brandTheme } from "@/lib/brand-theme";
import { LoginFlow } from "./LoginFlow";

// Pantalla de ingreso con la identidad de BONNY; el cuarto se identifica con el logo y el nombre del cliente.
export default function LoginPage() {
  const { logo } = brandTheme();
  return (
    <main className="bonny flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-black/5 bg-white/70 px-5 py-3 backdrop-blur-xl sm:px-10">
        <BonnyMark />
        <span className="hidden text-[0.8rem] text-bonny-sub sm:block">Cuartos de datos privados</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,.04),0_12px_40px_-12px_rgba(0,0,0,.14)] sm:p-9">
          <div className="mb-7 border-b border-black/5 pb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="" className="mx-auto mb-3 h-14 w-auto" />}
            <p className="eyebrow">{brand.roomName}</p>
            <h1 className="mt-1 font-display text-[2rem] leading-tight italic">{brand.orgName}</h1>
          </div>
          <Suspense>
            <LoginFlow />
          </Suspense>
        </div>

        <div className="mt-6 max-w-[440px] space-y-2 text-center text-xs leading-relaxed text-bonny-sub">
          <p>El uso de este espacio implica la aceptación del registro de su actividad (IP, ubicación aproximada, dispositivo y acciones).</p>
          <p>
            Este sitio usa solo cookies esenciales para mantener su sesión segura; no usa cookies de publicidad ni de analítica.{" "}
            <Link href="/privacidad#cookies" className="underline">Más información</Link>
          </p>
          <p>
            <Link href="/privacidad" className="underline">Política de tratamiento de datos</Link>{" · "}
            <Link href="/terminos" className="underline">Términos de uso</Link>
          </p>
        </div>
      </div>

      <footer className="pb-6 text-center text-xs text-bonny-sub">
        <span className="font-medium text-bonny-ink">Verificación en dos pasos</span> · Registro inalterable
      </footer>
    </main>
  );
}
