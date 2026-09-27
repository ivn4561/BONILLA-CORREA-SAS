"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, exact = false }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} className={`border-b-2 px-1 py-4 text-xs font-semibold uppercase tracking-wider transition ${active ? "border-gold text-white" : "border-transparent text-white/60 hover:text-white"}`}>
      {children}
    </Link>
  );
}
