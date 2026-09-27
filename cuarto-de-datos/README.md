# Cuarto de datos

Espacio seguro donde solo personas invitadas (auditores y administradores) **consultan** documentos confidenciales,
sin poder editarlos ni descargarlos, con un **registro de actividad inalterable y verificable**.

Stack: Next.js 16 (App Router, TypeScript), Tailwind 4, Supabase (Auth + Postgres), Google Drive API (cuenta de servicio, solo lectura), Vercel.

---

## Qué hace

| Área | Funcionalidad |
|---|---|
| Acceso | Solo por invitación (registro público desactivado). Contraseña + **2FA obligatorio (TOTP)**. Contraseña temporal que se cambia en el primer ingreso. Bloqueo tras 5 intentos fallidos en 15 min. Cierre por inactividad (navegador **y** servidor). Fecha fin de acceso por usuario. Revocación inmediata. |
| Documentos | Carpeta privada de Google Drive leída por una cuenta de servicio con permiso de solo lectura. El servidor entrega los bytes; nunca hay enlaces de Drive. El administrador decide qué documentos son visibles. |
| Visor | PDF e imágenes en `<canvas>` (pdf.js) con **marca de agua incrustada** (correo, fecha/hora, IP). Word (.docx) y Excel (.xlsx) convertidos a HTML de solo lectura en el servidor. Google Docs/Sheets/Slides se exportan a PDF. Sin descargar, imprimir, copiar ni clic derecho; el contenido se oculta si la ventana pierde el foco. |
| Registro | Inicio de sesión, intentos fallidos, 2FA, cierres (manual/inactividad), aperturas, cambios de página, tiempo de visualización, intentos de copiar/imprimir, intentos de descarga directa y **toda acción de administración**. Cada fila: usuario, acción, documento, fecha y hora (UTC + zona local), IP, ciudad/región/país, navegador, sistema y dispositivo. |
| Integridad | Tabla de **solo inserción** (sin UPDATE/DELETE/TRUNCATE para ningún rol de la API, con trigger que lo impide también al superusuario) y **hash SHA-256 encadenado**: cualquier alteración o borrado se detecta con «Verificar integridad». |
| Panel | Resumen, historial con filtros (usuario, documento, acción, fechas), exportación **CSV y PDF** (el SHA-256 de cada archivo exportado queda en el registro), gestión de usuarios y documentos. |
| Marca | Nombre de la empresa y del espacio configurables por variables de entorno (producto reutilizable para otros clientes). |

## Estructura

```
cuarto-de-datos/
├─ src/
│  ├─ proxy.ts                  sesión + cierre por inactividad en cada petición
│  ├─ app/
│  │  ├─ login/                 contraseña → 2FA → cambio de contraseña
│  │  ├─ salir/                 cierre forzado (inactividad, acceso vencido o revocado)
│  │  ├─ (app)/documentos/      lista de documentos visibles
│  │  ├─ (app)/visor/[id]/      visor protegido
│  │  ├─ (app)/admin/           resumen, actividad, usuarios, documentos
│  │  └─ api/                   auth, files, docs/render, view/*, admin/*
│  └─ lib/                      audit, auth, docs (drive/local), convert, export, request-context…
├─ supabase/migrations/         esquema, RLS, triggers y verificación de la cadena
├─ scripts/create-admin.mjs     crea el primer administrador
├─ demo-docs/                   documentos de ejemplo (DOCS_SOURCE=local)
└─ tests/                       pruebas de punta a punta (Playwright) · src/__tests__ unitarias (Vitest)
```

---

## Puesta en marcha (producción)

### 1. Supabase

1. Cree un proyecto en <https://supabase.com> (plan Free).
2. **Authentication → Sign In / Providers**:
   - Desactive **Allow new users to sign up**.
   - Deje **Email** habilitado (si lo desactiva, nadie puede entrar).
3. **Authentication → Multi-Factor**: compruebe que **TOTP** esté habilitado.
4. **SQL Editor**: pegue y ejecute el contenido de `supabase/migrations/20260927000000_esquema_inicial.sql`.
5. **Project Settings → API**: copie la *Project URL*, la clave *publishable/anon* y la clave *secret/service_role*.

### 2. Google Drive

1. En <https://console.cloud.google.com> cree un proyecto y active **Google Drive API**.
2. **IAM → Cuentas de servicio → Crear** (sin roles) → **Claves → JSON**. Guarde el archivo; **no lo suba al repositorio**.
3. En Drive, comparta la carpeta «Cuarto de datos» con el correo de la cuenta de servicio con permiso **Lector**.
4. Copie el ID de la carpeta (la parte final de `drive.google.com/drive/folders/ID`).
5. Convierta el JSON a base64 para la variable de entorno:
   `base64 -w0 cuenta-servicio.json` (macOS: `base64 -i cuenta-servicio.json`).

### 3. Vercel

1. **Add New → Project** → importe este repositorio.
2. **Root Directory: `cuarto-de-datos`**. Framework: Next.js.
3. Cargue las variables de entorno de `.env.example` (con `DOCS_SOURCE=drive`). Genere `SESSION_SECRET` con:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
4. Despliegue.

### 4. Primer administrador

En su equipo, con un `.env.local` que tenga `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del proyecto real:

```bash
npm install
npm run create-admin -- correo@empresa.com "Nombre Apellido"
```

Imprime una contraseña temporal. En el primer ingreso se pide activar 2FA y crear una contraseña propia.

---

## Uso

**Administrador**
1. Suba los archivos a la carpeta de Drive (organizada en subcarpetas por tema).
2. **Gestión de documentos → Sincronizar**. Publique los documentos o carpetas que deben ver los auditores.
3. **Usuarios → Invitar**: correo, nombre, firma, rol y fecha fin (opcional). Entregue la contraseña temporal por un canal distinto al del enlace.
4. **Actividad**: filtre y exporte a CSV/PDF. Use **Verificar integridad** antes de entregar un reporte.
5. Al terminar la auditoría: **Quitar acceso** a cada auditor o deje que venza su fecha fin.

**Auditor**: entra con su correo, contraseña y código 2FA, abre los documentos y navega por las páginas. Todo queda registrado.

---

## Limitaciones (léalas antes de entregar)

- **No es posible impedir capturas de pantalla ni fotos con el móvil.** La marca de agua con correo, hora e IP disuade y permite rastrear una filtración.
- Para mostrar un documento, sus datos llegan al navegador. Un usuario técnico podría extraerlos con las herramientas de desarrollador. Los bloqueos dificultan la copia pero no la hacen imposible. Si alguien intenta abrir la URL del archivo directamente, recibe un 403 y el intento queda registrado.
- **Word/Excel**: la conversión a HTML conserva texto, tablas, listas, imágenes y formato numérico básico, pero no el diseño exacto (encabezados de página, gráficos de Excel, fórmulas visibles). Para fidelidad total, suba la versión PDF o conviértalos a Google Docs/Sheets en Drive (se exportan a PDF automáticamente). No se admiten `.doc`, `.xls` ni `.pptx` antiguos: conviértalos a PDF.
- **Tiempo de visualización**: cuenta solo con la pestaña visible y enfocada. Es una aproximación: si el navegador se cierra de golpe, se pierden como máximo los últimos 30 s.
- **Ubicación**: se deduce de la IP (cabeceras de Vercel). Es aproximada (ciudad) y una VPN la altera.
- **Registro inalterable**: nadie puede modificarlo desde la aplicación ni con las claves de la API. El dueño del proyecto de Supabase (acceso de superusuario a Postgres) podría desactivar los triggers, pero la **cadena de hashes lo delataría** al verificar. Para máxima garantía, exporte y entregue copias periódicas: el hash de cada exportación queda en el propio registro.
- **Plan gratuito de Supabase**: el proyecto se pausa tras 7 días sin actividad. Los datos se conservan y se reactiva desde el panel.
- **Plan Hobby de Vercel**: según sus condiciones es para uso no comercial. Para una empresa, lo correcto es el plan Pro.

---

## Desarrollo local

Requiere Node 20+ y Docker.

```bash
npm install
npx supabase start                 # Postgres + Auth locales (aplica la migración)
cp .env.example .env.local         # use las claves que imprime supabase start y DOCS_SOURCE=local
npm run create-admin -- admin@demo.co "Admin Demo"
npm run dev
```

Pruebas:

```bash
npm run lint && npm run typecheck && npm test            # estáticas + unitarias
npx supabase db reset && npm run create-admin -- admin@demo.co "Admin Demo"
npm run build && npm start &                              # servidor de producción
ADMIN_TEMP_PASSWORD=<la contraseña impresa> npm run test:e2e -- tests/flujo-completo.spec.ts
```
