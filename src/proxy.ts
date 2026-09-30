import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { positiveNumber } from "@/lib/env-utils";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { ACTIVITY_COOKIE, activityCookieOptions, createActivityValue, readActivityValue } from "@/lib/session-cookie";

const PUBLIC = ["/login", "/salir", "/api/auth/login", "/api/auth/state", "/api/cron/keepalive", "/privacidad", "/terminos"];
// Estas rutas no cuentan como actividad del usuario (latidos del visor y descarga de bytes).
const PASSIVE = ["/api/view/heartbeat", "/api/files/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isApi = pathname.startsWith("/api/");

  if (!user) {
    if (isPublic) return response;
    if (isApi) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/salir" || pathname === "/api/auth/login") return response;

  // Cierre por inactividad, verificado en el servidor.
  const secret = process.env.SESSION_SECRET!;
  const idleMs = positiveNumber(process.env.IDLE_TIMEOUT_MINUTES, 15) * 60_000;
  const grace = Number(process.env.IDLE_GRACE_SECONDS?.trim() || 90);
  const graceMs = (Number.isFinite(grace) && grace >= 0 ? grace : 90) * 1000;
  const act = readActivityValue(request.cookies.get(ACTIVITY_COOKIE)?.value, secret);
  const expired = !act || act.uid !== user.id || Date.now() - act.at > idleMs + graceMs;

  if (expired) {
    if (isApi) return NextResponse.json({ error: "sesion_expirada" }, { status: 401 });
    return NextResponse.redirect(new URL("/salir?motivo=inactividad", request.url));
  }

  if (!PASSIVE.some((p) => pathname.startsWith(p))) {
    response.cookies.set(ACTIVITY_COOKIE, createActivityValue(user.id, secret, act.sid), activityCookieOptions);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|pdfjs/|favicon.ico|robots.txt).*)"],
};
