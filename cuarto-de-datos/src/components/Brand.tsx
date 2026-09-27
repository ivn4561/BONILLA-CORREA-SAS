import { brand } from "@/lib/brand";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect x="3" y="3" width="26" height="26" rx="2" fill="none" stroke="#c9a84c" strokeWidth="1.5" />
        <path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" stroke="#c9a84c" strokeWidth="1.5" />
        <rect x="9" y="14" width="14" height="10" rx="1" fill="#c9a84c" />
        <circle cx="16" cy="19" r="1.6" fill={light ? "#1a2744" : "#fff"} />
      </svg>
      <div className="leading-tight">
        <div className={`font-serif text-lg font-semibold ${light ? "text-white" : "text-navy"}`}>{brand.orgName}</div>
        <div className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-gold">{brand.roomName}</div>
      </div>
    </div>
  );
}
