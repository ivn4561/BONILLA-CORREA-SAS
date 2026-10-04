// Marca del cliente dentro del cuarto de datos (colores, tipografía y logo), configurable por variables de entorno.
// Si una variable falta o no es válida, se conserva el aspecto de siempre: nada cambia sin configurarlo.

type Env = Record<string, string | undefined>;

export type BrandTheme = {
  /** Variables CSS que reemplazan los colores y letras del tema (vacío = tema de siempre). */
  style: Record<string, string>;
  /** Logo para fondos claros (pantalla de ingreso). Ruta dentro de /marcas. */
  logo: string | null;
  /** Logo para fondos oscuros (barra superior del cuarto). Ruta dentro de /marcas. */
  logoOnDark: string | null;
};

const HEX = /^#[0-9a-f]{6}$/i;
// Solo archivos de public/marcas: la política de seguridad no admite imágenes de otros dominios
// y el proxy deja ver esa carpeta sin iniciar sesión (ver matcher en src/proxy.ts).
const LOGO_PATH = /^\/marcas\/[\w-]+(\.[\w-]+)*\.(svg|png|webp)$/i;
const FONTS: Record<string, string> = {
  poppins: '"Poppins", system-ui, sans-serif',
};

function color(value: string | undefined): string | null {
  const v = value?.trim();
  return v && HEX.test(v) ? v.toLowerCase() : null;
}

function logoPath(value: string | undefined): string | null {
  const v = value?.trim();
  return v && LOGO_PATH.test(v) ? v : null;
}

export function brandTheme(e: Env = process.env): BrandTheme {
  const style: Record<string, string> = {};

  const primary = color(e.BRAND_COLOR_PRIMARY);
  if (primary) {
    style["--color-navy"] = primary;
    style["--color-ink"] = primary;
    style["--color-navy-2"] = `color-mix(in oklab, ${primary} 82%, white)`;
  }

  // Acento sobre fondos oscuros (barra superior, botones de acento).
  const accent = color(e.BRAND_COLOR_ACCENT);
  if (accent) {
    style["--color-gold"] = accent;
    style["--color-gold-2"] = `color-mix(in oklab, ${accent} 75%, white)`;
  }

  // Acento sobre fondos claros (textos, bordes y foco). Debe contrastar con el blanco.
  const accentOnLight = color(e.BRAND_COLOR_ACCENT_ON_LIGHT);
  if (accentOnLight) {
    style["--color-gold-ink"] = accentOnLight;
    style["--color-gold-line"] = accentOnLight;
  }

  const font = FONTS[e.BRAND_FONT?.trim().toLowerCase() ?? ""];
  if (font) {
    style["--font-sans"] = font;
    style["--font-serif"] = font;
  }

  return { style, logo: logoPath(e.BRAND_LOGO), logoOnDark: logoPath(e.BRAND_LOGO_ON_DARK) };
}
