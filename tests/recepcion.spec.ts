import { test, expect } from "@playwright/test";

/**
 * Recepción BONNY + cuarto protegido por el código.
 * Requiere dos servidores de la misma compilación:
 *  - cuarto en E2E_BASE_URL (3000) con RECEPTION_SECRET y RECEPTION_URL=http://localhost:3001
 *  - recepción en RECEPTION_BASE_URL (3001) con APP_MODE=recepcion y RECEPTION_ROOMS (código ROOM_CODE → cuarto)
 * y un admin recién creado (ADMIN_TEMP_PASSWORD).
 */
test.skip(!process.env.RECEPTION_TEST, "Solo con RECEPTION_TEST=1");
test.describe.configure({ mode: "serial" });

const RECEPTION = process.env.RECEPTION_BASE_URL ?? "http://localhost:3001";
const CODE = process.env.ROOM_CODE ?? "482731";

test("sin pasar por la recepción, el cuarto envía a la recepción", async ({ page, request }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(new RegExp(`^${RECEPTION}/?$`));
  await expect(page.getByRole("heading", { name: /Llave y control/ })).toBeVisible();
  // La API de ingreso tampoco responde sin el código del cuarto
  const res = await request.post("/api/auth/login", { data: { email: "admin@demo.co", password: "x" }, headers: { origin: "http://localhost:3000" } });
  expect(res.status()).toBe(403);
});

test("código equivocado: mensaje genérico; código correcto: llega al ingreso del cuarto", async ({ page }) => {
  await page.goto(RECEPTION);
  await page.getByLabel("Código del cuarto").fill("000000");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator("#room-code-error")).toContainText("Código no válido");
  await expect(page).toHaveURL(new RegExp(`^${RECEPTION}/?$`));

  await page.getByLabel("Código del cuarto").fill(CODE);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/localhost:3000\/login/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cambiar de cuarto/ })).toHaveAttribute("href", new RegExp(RECEPTION));
  const pass = (await page.context().cookies("http://localhost:3000")).find((c) => c.name === "dr_room");
  expect(pass?.httpOnly).toBe(true);

  // Con el pase del cuarto, el ingreso funciona como siempre
  await page.getByLabel("Correo electrónico").fill("admin@demo.co");
  await page.getByLabel("Contraseña").fill(process.env.ADMIN_TEMP_PASSWORD!);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Active la verificación en dos pasos" })).toBeVisible();
});

test("un pase de entrada falso o vencido no sirve", async ({ page }) => {
  await page.goto("/entrar?t=9999999999999.abc.firma-falsa");
  await expect(page).toHaveURL(new RegExp(`^${RECEPTION}/?$`));
  await page.goto("/login");
  await expect(page).toHaveURL(new RegExp(`^${RECEPTION}/?$`));
});

test("la recepción bloquea tras 5 códigos equivocados desde la misma IP", async ({ playwright }) => {
  const api = await playwright.request.newContext({
    baseURL: RECEPTION,
    extraHTTPHeaders: { "x-forwarded-for": "203.0.113.9", origin: RECEPTION },
  });
  for (let i = 0; i < 5; i++) {
    const r = await api.post("/api/recepcion", { data: { codigo: `10000${i}` } });
    expect(r.status()).toBe(401);
  }
  const blocked = await api.post("/api/recepcion", { data: { codigo: CODE } });
  expect(blocked.status()).toBe(429);
  // Otras rutas no existen en la recepción
  expect((await api.get("/api/auth/state")).status()).toBe(404);
  await api.dispose();
});
