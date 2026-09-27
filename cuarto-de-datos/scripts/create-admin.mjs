// Crea (o reconvierte) el primer administrador.
// Uso: npm run create-admin -- correo@dominio.com "Nombre Apellido"
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";

const [email, fullName = "Administrador"] = process.argv.slice(2);
if (!email) {
  console.error('Uso: npm run create-admin -- correo@dominio.com "Nombre Apellido"');
  process.exit(1);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789"];
const all = sets.join("");
const chars = sets.map((s) => s[randomInt(s.length)]);
while (chars.length < 16) chars.push(all[randomInt(all.length)]);
for (let i = chars.length - 1; i > 0; i--) {
  const j = randomInt(i + 1);
  [chars[i], chars[j]] = [chars[j], chars[i]];
}
const password = chars.join("");

const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  console.error("No se pudo crear el usuario:", error.message);
  process.exit(1);
}
const { error: pErr } = await db.from("profiles").insert({
  id: data.user.id, email: email.toLowerCase(), full_name: fullName, role: "admin", must_change_password: true,
});
if (pErr) {
  await db.auth.admin.deleteUser(data.user.id);
  console.error("No se pudo crear el perfil:", pErr.message);
  process.exit(1);
}
await db.from("audit_log").insert({
  action: "admin_usuario_creado", user_email: "sistema", details: { usuario: email, rol: "admin", origen: "script create-admin" },
});
console.log("\nAdministrador creado");
console.log("  Correo:               ", email);
console.log("  Contraseña temporal:  ", password);
console.log("\nEn el primer ingreso se pedirá activar 2FA y cambiar la contraseña.\n");
