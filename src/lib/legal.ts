import { brand } from "@/lib/brand";

/**
 * Versión vigente de los Términos de uso y de la Política de tratamiento de datos.
 * Al cambiar el texto de cualquiera de los dos, suba esta versión: todos los usuarios
 * deberán aceptar de nuevo en su siguiente ingreso (y quedará registrado).
 */
export const LEGAL_VERSION = "2026-09-30";
export const LEGAL_DATE_LABEL = "30 de septiembre de 2026";

const PENDING = "Pendiente de completar";

/** Datos del responsable y del encargado del tratamiento (configurables por variables de entorno). */
export function legalInfo() {
  const v = (name: string) => process.env[name]?.trim() || null;
  return {
    responsible: v("LEGAL_RESPONSIBLE_NAME") ?? brand.orgName,
    responsibleId: v("LEGAL_RESPONSIBLE_ID") ?? PENDING,
    address: v("LEGAL_RESPONSIBLE_ADDRESS") ?? PENDING,
    email: v("LEGAL_CONTACT_EMAIL") ?? PENDING,
    phone: v("LEGAL_CONTACT_PHONE") ?? PENDING,
    processor: v("LEGAL_PROCESSOR_NAME") ?? "BONNY Analytics",
    pending: PENDING,
  };
}
