import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { positiveNumber } from "@/lib/env-utils";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { ACTIVITY_COOKIE, activityCookieOptions, createActivityValue, readActivityValue } from "@/lib/session-cookie";
import { ROOM_COOKIE, isReceptionMode, readRoomPass, receptionConfig } from "@/lib/reception";

const PUBLIC = ["/login", "/salir", "/entrar", "/api/auth/login", "/api/auth/state", "/api/cron/keepalive", "/privacidad", "/terminos"];
// Con recepción activa, estas rutas públicas exigen haber escrito el código del cuarto (cookie dr_room).
const NEEDS_ROOM_PASS = ["/login", "/api/auth/login", "/api/auth/state"];
// Estas rutas no cuentan como actividad del usuario (latidos del visor y descarga de bytes).
const PASSIVE = ["/api/view/heartbeat", "/api/files/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Recepción BONNY: solo la página del código y su API; no hay sesiones ni base de datos.
  if (isReceptionMode()) {
    if (pathname === "/" || pathname === "/api/recepcion") return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });
    return NextResponse.redirect(new URL("/", request.url));
  }

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
  const matches = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const isPublic = PUBLIC.some(matches);
  const isApi = pathname.startsWith("/api/");

  if (!user) {
    const gate = receptionConfig();
    if (gate.status === "invalid" && NEEDS_ROOM_PASS.some(matches)) {
      console.error("RECEPTION_SECRET o RECEPTION_URL no son válidos: el ingreso queda cerrado hasta corregirlos.");
      const msg = "El ingreso a este cuarto no está disponible por un error de configuración. Avise al administrador.";
      if (isApi) return NextResponse.json({ error: msg }, { status: 503 });
      return new NextResponse(msg, { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (gate.status === "on" && NEEDS_ROOM_PASS.some(matches) && !readRoomPass(request.cookies.get(ROOM_COOKIE)?.value, process.env.SESSION_SECRET!)) {
      if (isApi) return NextResponse.json({ error: "Vuelva a la recepción y escriba el código del cuarto." }, { status: 403 });
      return NextResponse.redirect(gate.url);
    }
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
  // marcas/: logos de los clientes, visibles también en la pantalla de ingreso.
  matcher: ["/((?!_next/static|_next/image|pdfjs/|marcas/|favicon.ico|robots.txt).*)"],
};
