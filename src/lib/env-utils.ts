/** Número positivo desde una variable de entorno; si falta, está vacía o no es válida, usa el valor por defecto. */
export function positiveNumber(value: string | undefined, fallback: number): number {
  const n = Number(value?.trim());
  return value?.trim() && Number.isFinite(n) && n > 0 ? n : fallback;
}
