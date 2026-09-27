import { randomInt } from "node:crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";

/** Contraseña temporal de 16 caracteres (sin caracteres ambiguos), cumple la política. */
export function tempPassword(): string {
  const all = UPPER + LOWER + DIGIT;
  const chars = [UPPER[randomInt(UPPER.length)], LOWER[randomInt(LOWER.length)], DIGIT[randomInt(DIGIT.length)]];
  while (chars.length < 16) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
