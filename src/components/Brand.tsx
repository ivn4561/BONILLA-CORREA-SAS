import { brand } from "@/lib/brand";
import { brandTheme } from "@/lib/brand-theme";

export function BrandMark({ light = false }: { light?: boolean }) {
  const { logoOnDark } = brandTheme();
  if (light && logoOnDark) {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoOnDark} alt={brand.orgName} className="h-9 w-auto" />
        <div className="border-l border-white/20 pl-3 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-gold">{brand.roomName}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect x="3" y="3" width="26" height="26" rx="2" fill="none" className="stroke-gold" strokeWidth="1.5" />
        <path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" className="stroke-gold" strokeWidth="1.5" />
        <rect x="9" y="14" width="14" height="10" rx="1" className="fill-gold" />
        <circle cx="16" cy="19" r="1.6" className={light ? "fill-navy" : "fill-white"} />
      </svg>
      <div className="leading-tight">
        <div className={`font-serif text-lg font-semibold ${light ? "text-white" : "text-navy"}`}>{brand.orgName}</div>
        <div className={`text-[0.6rem] font-semibold uppercase tracking-[0.2em] ${light ? "text-gold" : "text-gold-ink"}`}>{brand.roomName}</div>
      </div>
    </div>
  );
}

/** Emblema del zorro de BONNY, en línea fina. Toma el color del texto que lo rodea. */
export function BonnyFox({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M60 104 L30 58 L24 14 L50 38 L60 34 L70 38 L96 14 L90 58 Z" />
      <path d="M30 58 L60 74 L90 58" opacity=".45" />
      <path d="M44 56 L52 60 M76 56 L68 60" />
      <path d="M56 98 L60 104 L64 98 Z" fill="currentColor" />
    </svg>
  );
}

/** Marca de BONNY con su lema, para la recepción y la pantalla de ingreso. */
export function BonnyMark({ tagline = true }: { tagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-bonny-ink">
      <BonnyFox className="h-7 w-7" />
      <div className="leading-none">
        <div className="font-bonny text-sm font-semibold tracking-[0.22em]">BONNY</div>
        {tagline && <div className="mt-1 font-display text-[0.95rem] italic text-bonny-sub">Llave y control</div>}
      </div>
    </div>
  );
}
