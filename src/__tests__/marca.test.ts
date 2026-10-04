import { describe, expect, it } from "vitest";
import { brandTheme } from "@/lib/brand-theme";

describe("marca del cliente", () => {
  it("sin variables conserva el aspecto de siempre", () => {
    expect(brandTheme({})).toEqual({ style: {}, logo: null, logoOnDark: null });
  });

  it("aplica colores, tipografía y logos válidos", () => {
    const t = brandTheme({
      BRAND_COLOR_PRIMARY: "#1E1E59",
      BRAND_COLOR_ACCENT: "#b6ff00",
      BRAND_COLOR_ACCENT_ON_LIGHT: "#7036ff",
      BRAND_FONT: "Poppins",
      BRAND_LOGO: "/marcas/harbor-shipping.svg",
      BRAND_LOGO_ON_DARK: "/marcas/harbor-shipping-negativo.svg",
    });
    expect(t.style["--color-navy"]).toBe("#1e1e59");
    expect(t.style["--color-gold"]).toBe("#b6ff00");
    expect(t.style["--color-gold-line"]).toBe("#7036ff");
    expect(t.style["--font-sans"]).toContain("Poppins");
    expect(t.logo).toBe("/marcas/harbor-shipping.svg");
    expect(t.logoOnDark).toBe("/marcas/harbor-shipping-negativo.svg");
  });

  it("ignora valores no válidos (no permite inyectar estilos ni imágenes externas)", () => {
    const t = brandTheme({
      BRAND_COLOR_PRIMARY: "red; background:url(https://x.co/a)",
      BRAND_COLOR_ACCENT: "#fff",
      BRAND_FONT: "Comic Sans",
      BRAND_LOGO: "https://otro-sitio.com/logo.svg",
      BRAND_LOGO_ON_DARK: "/marcas/../api/files/1.svg",
    });
    expect(t).toEqual({ style: {}, logo: null, logoOnDark: null });
    expect(brandTheme({ BRAND_LOGO: "/pdfjs/logo.svg" }).logo).toBeNull();
    expect(brandTheme({ BRAND_LOGO: "/marcas/logo.js" }).logo).toBeNull();
  });
});
