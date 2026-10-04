import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
// Identidad BONNY (pantalla de ingreso)
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
// Tipografías opcionales de clientes (BRAND_FONT). El navegador solo las descarga si se usan.
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import { brand } from "@/lib/brand";
import { brandTheme } from "@/lib/brand-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: `${brand.roomName} · ${brand.orgName}`,
  description: "Espacio seguro de consulta de documentos confidenciales.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" style={brandTheme().style as React.CSSProperties}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
