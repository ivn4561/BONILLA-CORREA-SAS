import { test, expect, type Page } from "@playwright/test";
import { totp } from "./totp";

// Requiere un servidor con IDLE_TIMEOUT_MINUTES=1 e IDLE_GRACE_SECONDS=0 (E2E_BASE_URL) y el secreto TOTP del admin.
test.skip(!process.env.IDLE_TEST, "Solo con IDLE_TEST=1");
test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL ?? "admin@demo.co");
  await page.getByLabel("Contraseña").fill(process.env.ADMIN_PASSWORD ?? "AdminSeguro2026x");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Código de 6 dígitos").fill(totp(process.env.SECRET!));
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test("el navegador cierra la sesión tras el tiempo de inactividad", async ({ page }) => {
  await login(page);
  await page.goto("/documentos");
  await expect(page.getByText("Su sesión se cerrará en")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/login\?motivo=inactividad/, { timeout: 75_000 });
  await expect(page.getByText("Su sesión se cerró por inactividad.")).toBeVisible();
});

test("el servidor rechaza una sesión inactiva aunque el navegador no colabore", async ({ page, context }) => {
  await new Promise((r) => setTimeout(r, 31_000)); // nuevo código TOTP
  await login(page);
  await page.close(); // sin JavaScript vivo que cierre la sesión
  await new Promise((r) => setTimeout(r, 63_000));
  const api = await context.request.get("/api/auth/state", { maxRedirects: 0 });
  const res = await context.request.get("/documentos", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/salir?motivo=inactividad");
  const follow = await context.request.get("/documentos");
  expect(follow.url()).toContain("/login?motivo=inactividad");
  expect(api.status()).toBe(401); // las APIs también rechazan la sesión vencida
});
