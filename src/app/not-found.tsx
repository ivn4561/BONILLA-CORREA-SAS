import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-serif text-3xl text-navy">Documento no disponible</h1>
      <p className="text-sm text-muted">No existe o no tiene permiso para verlo.</p>
      <Link href="/documentos" className="btn-primary">Volver a documentos</Link>
    </main>
  );
}
