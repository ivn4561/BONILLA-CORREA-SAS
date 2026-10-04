import { BonnyFox, BonnyMark } from "@/components/Brand";
import { RoomCodeForm } from "./RoomCodeForm";

/** Recepción BONNY: el visitante escribe el código de su cuarto de datos. */
export function Reception() {
  return (
    <div className="bonny flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-black/5 bg-white/70 px-5 py-3 backdrop-blur-xl sm:px-10">
        <BonnyMark tagline={false} />
        <span className="hidden text-[0.8rem] text-bonny-sub sm:block">Cuartos de datos privados</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <BonnyFox className="mb-6 h-14 w-14 text-bonny-ink" />
        <h1 className="font-display text-5xl leading-none sm:text-6xl">
          Llave y <em>control.</em>
        </h1>
        <p className="mt-4 text-lg text-bonny-sub">Ingrese el código de su cuarto de datos.</p>
        <div className="mt-9 w-full max-w-[440px] rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,.04),0_12px_40px_-12px_rgba(0,0,0,.14)] sm:p-9">
          <RoomCodeForm />
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-bonny-sub">
        <span className="font-medium text-bonny-ink">Verificación en dos pasos</span> · Registro inalterable
      </footer>
    </div>
  );
}
