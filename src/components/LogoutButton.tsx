"use client";

export function LogoutButton() {
  return (
    <button
      className="text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo: "manual" }) });
        location.href = "/login";
      }}
    >
      Cerrar sesión
    </button>
  );
}
