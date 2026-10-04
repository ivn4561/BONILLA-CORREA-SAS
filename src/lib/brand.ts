export const brand = {
  // Empresa dueña del cuarto. Se configura por instalación; vacío = nombre genérico de demostración.
  orgName: process.env.NEXT_PUBLIC_ORG_NAME?.trim() || "Empresa de demostración",
  roomName: process.env.NEXT_PUBLIC_ROOM_NAME?.trim() || "Cuarto de datos",
};

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Bogota";

export function formatDateTime(value: string | Date, withSeconds = true): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const s = new Intl.DateTimeFormat("es-CO", {
    timeZone: APP_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  }).format(d);
  return s;
}

/** Fecha y hora con zona explícita, p. ej. "27/09/2026, 14:03:22 (UTC-05:00 America/Bogota)". */
export function formatDateTimeTz(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "longOffset" })
    .formatToParts(d).find((p) => p.type === "timeZoneName")?.value?.replace("GMT", "UTC") ?? "";
  return `${formatDateTime(d)} (${offset || "UTC"} ${APP_TIMEZONE})`;
}
