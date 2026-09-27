import { requirePage, type Profile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UsersManager } from "./UsersManager";

export default async function UsuariosPage() {
  const s = await requirePage({ admin: true });
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("*").order("created_at");
  const profiles = (data ?? []) as Profile[];

  // Último inicio de sesión de cada usuario
  const { data: logins } = await db.from("audit_log").select("user_id, occurred_at").eq("action", "login_exitoso").order("id", { ascending: false }).limit(2000);
  const last: Record<string, string> = {};
  for (const l of logins ?? []) if (l.user_id && !last[l.user_id]) last[l.user_id] = l.occurred_at;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administración</p>
        <h1 className="mt-1 font-serif text-4xl text-navy">Usuarios</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Solo las personas invitadas aquí pueden entrar. Al invitar se genera una contraseña temporal que debe entregar por un canal seguro;
          en el primer ingreso la persona activa la verificación en dos pasos y crea su propia contraseña.
        </p>
      </div>
      <UsersManager profiles={profiles} lastLogin={last} selfId={s.user.id} />
    </div>
  );
}
