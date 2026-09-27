import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Cliente de Supabase con la sesión del usuario (cookies httpOnly). Solo en servidor. */
export async function createSupabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // En Server Components no se pueden escribir cookies; el proxy las refresca.
        }
      },
    },
  });
}
