import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { LEGAL_DATE_LABEL } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-4"><BrandMark light /></header>
      <article className="legal mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">Documento legal · Vigente desde el {LEGAL_DATE_LABEL}</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">{title}</h1>
        {children}
        <p className="mt-10 border-t border-navy/10 pt-4 text-sm text-muted">
          <Link href="/privacidad" className="underline">Política de tratamiento de datos</Link>{" · "}
          <Link href="/terminos" className="underline">Términos de uso</Link>{" · "}
          <Link href="/login" className="underline">Volver al ingreso</Link>
        </p>
      </article>
    </main>
  );
}
