import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    screenshot: "only-on-failure",
    // Simula las cabeceras que Vercel agrega en producción (IP y geolocalización).
    extraHTTPHeaders: {
      "x-forwarded-for": "181.49.12.34",
      "x-vercel-ip-city": "Bogot%C3%A1",
      "x-vercel-ip-country-region": "DC",
      "x-vercel-ip-country": "CO",
    },
  },
});
