import { test, expect, type Page } from "@playwright/test";
import { totp } from "./totp";

/**
 * Flujo completo: administrador (primer ingreso) → publica documentos → invita auditor →
 * auditor (primer ingreso) consulta documentos → administrador revisa, exporta y revoca.
 * Requiere: Supabase local con un admin creado por scripts/create-admin.mjs (ADMIN_EMAIL / ADMIN_TEMP_PASSWORD).
 */
const ADMIN = process.env.ADMIN_EMAIL ?? "admin@demo.co";
const ADMIN_TEMP = process.env.ADMIN_TEMP_PASSWORD!;
const ADMIN_PW = "AdminSeguro2026x";
const AUD = `auditor.${Date.now()}@firma-auditora.co`;
const AUD_PW = "AuditorSeguro2026x";
const secrets: Record<string, string> = {};
let lastCode = "";

async function freshCode(email: string) {
  let code = totp(secrets[email]);
  while (code === lastCode) {
    await new Promise((r) => setTimeout(r, 2000));
    code = totp(secrets[email]);
  }
  lastCode = code;
  return code;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function firstLogin(page: Page, email: string, temp: string, newPw: string) {
  await login(page, email, temp);
  await expect(page.getByRole("heading", { name: "Active la verificación en dos pasos" })).toBeVisible();
  const secret = (await page.locator("code").first().textContent())!.trim();
  secrets[email] = secret;
  await page.getByLabel("Código de 6 dígitos").fill(await freshCode(email));
  await page.getByRole("button", { name: "Activar y continuar" }).click();
  await expect(page.getByRole("heading", { name: "Cree su contraseña" })).toBeVisible();
  await page.getByLabel("Nueva contraseña").fill(newPw);
  await page.getByLabel("Repetir contraseña").fill(newPw);
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
}

async function secondLogin(page: Page, email: string, password: string) {
  await login(page, email, password);
  await expect(page.getByRole("heading", { name: "Código de seguridad" })).toBeVisible();
  await page.getByLabel("Código de 6 dígitos").fill(await freshCode(email));
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
}

let auditorTemp = "";

/** Proporción de píxeles no blancos del canvas del visor. */
function inkRatio(page: Page) {
  return page.locator("canvas").evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let ink = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) ink++;
    return ink / (d.length / 4);
  });
}

test.describe.serial("cuarto de datos", () => {
  test("administrador: primer ingreso con 2FA y cambio de contraseña", async ({ page }) => {
    expect(ADMIN_TEMP, "Defina ADMIN_TEMP_PASSWORD").toBeTruthy();
    await firstLogin(page, ADMIN, ADMIN_TEMP, ADMIN_PW);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();

    // Las cookies de sesión no son legibles desde JavaScript (protección ante robo de sesión)
    const cookies = await page.context().cookies();
    const session = cookies.filter((c) => c.name.startsWith("sb-") || c.name === "dr_act");
    expect(session.length).toBeGreaterThan(1);
    for (const c of session) expect(c.httpOnly, `${c.name} debe ser httpOnly`).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/sb-|dr_act/);
  });

  test("administrador: sincroniza, publica documentos e invita auditor", async ({ page }) => {
    await secondLogin(page, ADMIN, ADMIN_PW);
    await page.goto("/admin/documentos");
    await page.getByRole("button", { name: "Sincronizar" }).click();
    await expect(page.getByTestId("sync-msg")).toContainText("5 archivos en origen");
    await page.reload();
    const publish = page.getByRole("button", { name: "Publicar carpeta" });
    const folders = await publish.count();
    expect(folders).toBe(3);
    for (let i = 0; i < folders; i++) {
      await Promise.all([page.waitForResponse((r) => r.url().includes("/api/admin/documents/") && r.request().method() === "PATCH"), publish.nth(i).click()]);
      await page.waitForTimeout(500);
    }
    await page.reload();
    await expect(page.locator("text=Visible")).toHaveCount(5);

    await page.goto("/admin/usuarios");
    await page.getByLabel("Correo").fill(AUD);
    await page.getByLabel("Nombre completo").fill("Auditora de Prueba");
    await page.getByLabel("Firma / entidad").fill("Firma Auditora Ltda.");
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel("Acceso hasta (opcional)").fill(nextMonth);
    await page.getByRole("button", { name: "Invitar" }).click();
    await expect(page.getByTestId("temp-password")).toBeVisible();
    auditorTemp = (await page.getByTestId("temp-password").locator("code").textContent())!.trim();
    expect(auditorTemp).toHaveLength(16);
    await logout(page);
  });

  test("intento fallido de inicio de sesión queda registrado", async ({ page }) => {
    await login(page, AUD, "contraseña-incorrecta");
    await expect(page.locator("p[role=alert]")).toContainText("Correo o contraseña incorrectos");
  });

  test("auditor: primer ingreso, consulta documentos con visor protegido", async ({ page, context }) => {
    await firstLogin(page, AUD, auditorTemp, AUD_PW);
    await expect(page).toHaveURL(/\/documentos$/);
    await expect(page.getByText("Estados financieros 2025.pdf")).toBeVisible();

    // No tiene acceso al panel de administración
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/documentos$/);

    // PDF: se dibuja en canvas, cambio de página, bloqueos
    await page.getByText("Estados financieros 2025.pdf").click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Página 1 de 5", { timeout: 20000 });
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    expect(await canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(300);
    // El canvas debe tener contenido real (texto del PDF + marca de agua), no una hoja en blanco.
    await expect.poll(() => inkRatio(page), { timeout: 15000 }).toBeGreaterThan(0.01);
    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Página 2 de 5");
    await page.waitForTimeout(1800); // registro de página (retardo 1,2 s)
    await page.keyboard.press("Control+p");
    await expect(page.getByRole("status")).toContainText("impresión está deshabilitada");
    await canvas.click({ button: "right", force: true });

    // Escudo anticaptura: existe y deja ver solo la franja bajo el cursor
    const shield = page.getByTestId("screen-shield");
    await expect(shield).toBeAttached();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 100, box.y + 150);
    await expect.poll(() => shield.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage)).toContain("linear-gradient");

    // Tecla Impr Pant: oculta el documento y queda registrado
    await page.waitForTimeout(600);
    await page.keyboard.press("PrintScreen");
    await expect(page.getByText("Captura de pantalla bloqueada.")).toBeVisible();
    await page.waitForTimeout(500);

    // Sin la cabecera del visor, el archivo no se entrega (p. ej. abriendo la URL directamente)
    const docUrl = page.url().split("/visor/")[1];
    const direct = await context.request.get(`/api/files/${docUrl}`);
    expect(direct.status()).toBe(403);
    const nav = await page.goto(`/api/files/${docUrl}`);
    expect(nav?.status()).toBe(403);

    // Word
    await page.goto("/documentos");
    await page.getByText("Acta asamblea No. 12.docx").click();
    await expect(page.locator(".doc-html h1")).toContainText("Acta de Asamblea General");
    await expect(page.locator(".doc-html")).toContainText("áéíóú ñ");

    // Excel con dos hojas
    await page.goto("/documentos");
    await page.getByText("Balance de prueba Q1 2026.xlsx").click();
    await expect(page.locator(".sheet-html")).toContainText("Bancos");
    await expect(page.locator(".sheet-html")).toContainText("144.000.000");
    await page.getByRole("button", { name: "Notas" }).click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Hoja 2 de 2");
    await page.waitForTimeout(1800);

    // Imagen
    await page.goto("/documentos");
    await page.getByText("Firma escaneada contrato marco.png").click();
    await expect(page.locator("canvas")).toBeVisible();
    await expect.poll(() => inkRatio(page), { timeout: 15000 }).toBeGreaterThan(0.01);
    await page.waitForTimeout(1500);
    await page.goto("/documentos");
    await page.waitForTimeout(1000);
    await logout(page);
  });

  test("administrador: revisa el registro, verifica integridad, exporta y revoca", async ({ page }) => {
    await secondLogin(page, ADMIN, ADMIN_PW);
    await page.goto(`/admin/actividad?user=${encodeURIComponent(AUD)}`);
    const table = page.getByTestId("audit-table");
    for (const action of ["login_fallido", "login_paso_contrasena", "mfa_activado", "cambio_contrasena", "login_exitoso", "documento_abierto", "pagina_vista", "documento_cerrado", "intento_copia", "acceso_directo_bloqueado", "cierre_sesion"]) {
      await expect(table.locator(`tr[data-action="${action}"]`).first(), `falta ${action}`).toBeVisible();
    }
    await expect(table).toContainText("181.49.12.34");
    await expect(table).toContainText("Bogotá, DC, CO");
    await expect(table).toContainText("Chrome");

    await page.getByRole("button", { name: "Verificar integridad del registro" }).click();
    await expect(page.getByTestId("verify-result")).toContainText("Cadena íntegra");

    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Exportar CSV" }).click()]);
    const csvText = await (await csv.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8"));
    expect(csvText).toContain("documento_abierto");
    expect(csvText).toContain(AUD);
    const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Exportar PDF" }).click()]);
    const pdfBuf = await (await pdf.createReadStream()).toArray().then((c) => Buffer.concat(c));
    expect(pdfBuf.subarray(0, 5).toString()).toBe("%PDF-");
    await csv.saveAs("test-results/registro.csv");
    await pdf.saveAs("test-results/registro.pdf");

    await page.goto("/admin/usuarios");
    page.once("dialog", (d) => d.accept());
    await page.locator(`tr[data-email="${AUD}"]`).getByRole("button", { name: "Quitar acceso" }).click();
    await expect(page.locator(`tr[data-email="${AUD}"]`)).toContainText("Revocado");
    await logout(page);
  });

  test("auditor revocado no puede entrar y queda registrado", async ({ page }) => {
    await login(page, AUD, AUD_PW);
    await expect(page.locator("p[role=alert]")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
