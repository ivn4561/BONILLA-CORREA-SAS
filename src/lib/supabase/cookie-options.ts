/**
 * Cookies de sesión de Supabase: httpOnly (JavaScript del navegador no puede leerlas)
 * y secure en producción. La app nunca usa Supabase desde el navegador, así que no las necesita.
 */
export const supabaseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
