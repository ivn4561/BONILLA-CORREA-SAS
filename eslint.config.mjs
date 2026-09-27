import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  // Tras cerrar sesión se fuerza una recarga completa a propósito (descarta todo el estado del cliente).
  { rules: { "@next/next/no-location-assign-relative-destination": "off" } },
  { ignores: [".next/**", "node_modules/**", "public/pdfjs/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] },
];

export default config;
