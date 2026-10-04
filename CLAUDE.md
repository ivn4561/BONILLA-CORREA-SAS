# CLAUDE.md — Memoria del proyecto «Cuarto de datos» (BONNY Analytics)

Este archivo es la memoria del proyecto: cualquier sesión de Claude Code que se abra en este repositorio lo lee
antes de trabajar. Mantenlo al día: al cerrar una tarea importante, actualiza la sección «Estado actual».

---

## 1. Quién es el dueño y cómo trabajar con él

- **Iván Bonilla Correa** (bivan4561@gmail.com), estudiante con conocimientos intermedios de desarrollo web.
  Trabaja desde un **iPad** (Safari, pantalla dividida) y vive en París (hora de Francia).
  Vende el producto con su marca **BONNY Analytics**, todavía no constituida como empresa. Su papá, el
  **Dr. Fredy Bonilla Esquivel** (Bonilla & Correa S.A.S., firma de abogados en Bogotá), es el aliado comercial y jurídico.
- **Idioma:** responder siempre en **español**, claro y sin tecnicismos. Si hace falta un término técnico, explicarlo
  con una comparación cotidiana. Ir paso a paso y decir dónde tocar en cada pantalla.
- **Precaución máxima con el código.** Lo ha pedido muchas veces:
  - nunca hacer cambios «a lo loco»: **primero diagnosticar** (registros de Vercel, código) y explicar la causa;
  - el código cambia **solo por PR** en la rama de trabajo, con pruebas. **Él fusiona**; nunca fusionar por él;
  - no tocar lo que no se pidió. Si una mejora no se puede **verificar**, decirlo y no hacerla;
  - nunca presentar algo como resuelto sin haberlo comprobado. Decir claramente qué no se pudo verificar
    (por ejemplo, Safari de iPad cuando solo se probó en Chromium).
- **Secretos:** nunca pedir que pegue claves en el chat. Las claves van en Vercel → Settings → Environment Variables.
  Si aparece una clave en una captura, recomendar rotarla.
- Le importan el precio justo (no inflar valores) y la honestidad sobre las limitaciones.

## 2. Qué es el producto

Un **cuarto de datos** (data room) para auditorías: un espacio web privado donde auditores invitados **leen**
documentos confidenciales sin poder descargarlos, imprimirlos ni copiarlos, y donde **todo queda registrado** en
un registro inalterable. Sirve para cualquier tipo de auditoría (externa, *due diligence*, entes de control, interna).

**Promesas de venta, que el código debe seguir cumpliendo:**
1. Acceso solo por invitación, contraseña y **2FA TOTP obligatorio** (Google/Microsoft Authenticator, gratis).
   Fecha de fin por usuario. Cierre por inactividad, verificado en el servidor. Bloqueo tras intentos fallidos.
2. Visor de solo lectura: PDF e imágenes en canvas, **marca de agua** con correo, fecha, hora e IP;
   **escudo anticaptura** (solo es nítida la franja bajo el cursor); bloqueo de imprimir, copiar y clic derecho,
   con registro de cada intento.
3. **Registro de actividad de solo inserción con hash SHA-256 encadenado** («sello de integridad»):
   quién, qué, documento, fecha y hora, IP, ciudad y país, navegador y dispositivo. Exportable a CSV y PDF.
4. Limitación honesta: **ninguna web impide una foto con el celular** ni una captura con los botones físicos.
   Se disuade (marca de agua, escudo) y se deja rastro (registro). Nunca prometer lo contrario.

## 3. Arquitectura

- **Next.js 16** (App Router, TypeScript, Turbopack), **Tailwind 4** (utilidades propias con `@utility` en `globals.css`).
- **Supabase**: Auth (correo + contraseña + TOTP) y Postgres. El navegador **nunca** habla con Supabase:
  todo pasa por el servidor con la clave `service_role`. RLS activo y sin políticas de escritura.
- **Google Drive**: una cuenta de servicio con permiso **solo lectura** sobre una carpeta. El servidor descarga
  los bytes y los entrega al visor. Nunca hay enlaces de Drive en el navegador.
- **Vercel**: hospedaje. La IP y la ubicación salen de las cabeceras `x-vercel-ip-*`; si faltan, se usa ipapi.co.
- **Proxy** (`src/proxy.ts`, el antiguo middleware): refresca la sesión, aplica el cierre por inactividad con la
  cookie firmada `dr_act` y define las rutas públicas.

### Mapa del código
| Ruta | Qué hace |
|---|---|
| `supabase/migrations/…esquema_inicial.sql` | Tablas `profiles`, `documents`, `view_sessions` y `audit_log` (con triggers que impiden UPDATE, DELETE y TRUNCATE, cadena de hashes, `verify_audit_chain()`, `recent_failed_logins()`). **No modificar sin migración nueva.** |
| `src/lib/auth.ts` | `getSessionState()` → etapas `anon / denied / mfa_enroll / mfa_verify / change_password / consent / ok`. `requirePage` y `requireApi` en **cada** página y API. |
| `src/lib/login-flow.ts`, `src/app/api/auth/*` | Login, 2FA, cambio de contraseña, consentimiento (Ley 1581), logout. |
| `src/lib/audit.ts` | `logEvent()`: «sin registro no hay acceso». Si falla, lanza error y se niega la acción. |
| `src/lib/actions.ts` | Catálogo de acciones registradas y su etiqueta en español. |
| `src/lib/docs/*` | Fuente de documentos: `drive.ts` (producción), `local.ts` (demo y pruebas con `demo-docs/`), `sync.ts`. |
| `src/app/api/files/[id]` | Entrega bytes **solo** al visor (cabecera `X-Viewer`), por rangos de 2 MB (límite de 4,5 MB de Vercel). Bloquea y registra el acceso directo. |
| `src/app/api/docs/[id]/render` | Word (mammoth) y Excel (exceljs) convertidos a HTML saneado (sanitize-html). |
| `src/app/(app)/visor/[id]/Viewer.tsx` | Visor: pdf.js en canvas (build *legacy*), marca de agua, escudo, bloqueos, latidos de tiempo de lectura. |
| `src/lib/watermark.ts` | Marca de agua en dos tonos (legible sobre fondos claros y oscuros). |
| `src/app/(app)/admin/*` | Panel: Resumen, Actividad (filtros, exportar, verificar), Usuarios, Gestión de documentos. Solo `admin`. |
| `src/lib/export.ts` | CSV (con protección contra inyección de fórmulas) y PDF (pdf-lib). El SHA-256 de cada exportación se registra. |
| `src/app/privacidad`, `src/app/terminos`, `src/lib/legal.ts` | Textos legales (Ley 1581/2012, Decreto 1377/2013). La versión está en `LEGAL_VERSION`: si se sube, todos aceptan de nuevo. |
| `src/app/api/cron/keepalive` + `vercel.json` | Tarea diaria que evita que Supabase gratuito se pause. |
| `src/app/login/page.tsx`, `src/components/Brand.tsx` | Ingreso con la **identidad BONNY** (zorro en línea, «Llave y control», DM Sans + Instrument Serif, estilo neutro tipo Apple). La clase `.bonny` de `globals.css` re-tematiza el formulario sin tocar su lógica. |
| `src/lib/brand-theme.ts`, `public/marcas/` | **Marca del cliente** dentro del cuarto: variables `BRAND_*` (colores #rrggbb, `BRAND_FONT=poppins`, logos en `/marcas/`). Vacías = aspecto de siempre. |

### Roles
Solo dos: **admin** (todo) y **auditor** (solo ve «Documentos»; las rutas de administración lo redirigen y las APIs
devuelven 403). No existe un rol de «solo ver el registro».

### Variables de entorno (ver `.env.example`)
`NEXT_PUBLIC_ORG_NAME`, `NEXT_PUBLIC_ROOM_NAME`, `APP_TIMEZONE` (America/Bogota), `SUPABASE_URL` (solo la base,
**sin** `/rest/v1`), `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (32 caracteres o más),
`IDLE_TIMEOUT_MINUTES` (**5** en producción), `REQUIRE_MFA=true`, `DOCS_SOURCE=drive`, `DRIVE_ROOT_FOLDER_ID`,
`GOOGLE_SERVICE_ACCOUNT_JSON` (el JSON pegado tal cual: debe **empezar con `{`** y terminar con `}`),
`GEO_FALLBACK`, `SCREEN_SHIELD`, `LEGAL_*` (datos del responsable del tratamiento), `CRON_SECRET` (opcional),
`BRAND_COLOR_PRIMARY`, `BRAND_COLOR_ACCENT`, `BRAND_COLOR_ACCENT_ON_LIGHT`, `BRAND_FONT`, `BRAND_LOGO`, `BRAND_LOGO_ON_DARK`
(marca del cliente, opcionales). Cambiar variables en Vercel exige volver a desplegar (Redeploy).
Las variables vacías usan su valor por defecto (`positiveNumber` en `env-utils.ts`).

## 4. Cómo probar (obligatorio antes de cada PR)

```bash
npm run lint && npm run typecheck && npm test        # 15 pruebas unitarias (Vitest)
# Docker (si falla, borrar /var/run/docker.pid de una sesión anterior) y Supabase local:
dockerd &  ;  npx supabase start  ;  npx supabase db reset
npm run create-admin -- admin@demo.co "Admin Demo"   # imprime la contraseña temporal
npm run build && npm start &
CHROMIUM_PATH=/opt/pw-browsers/chromium ADMIN_TEMP_PASSWORD=<la impresa> npx playwright test tests/flujo-completo.spec.ts
```
`.env.local` local: claves de Supabase local, `DOCS_SOURCE=local`. Las 6 pruebas de punta a punta recorren el
flujo completo de administrador y auditor y comprueban el registro. **No subir documentos personales a
`demo-docs/`** ni usar datos reales en las pruebas.

## 5. Estado actual (actualizar al terminar cada tarea)

- **Producción:** proyecto Vercel `bonilla-correa-sas` (`prj_Kgkk6nYNsMeSaNLumehBM34JuCEc`, equipo
  `team_V2fSMVVVkZMHlsJigxXYcgz7`), dirección **https://cuartodedatos-bonny.vercel.app**. Rama `main`.
  Respaldo de la versión entregada: rama **`entrega-v1`** (commit `45a406f`, PR #8). Para volver atrás:
  Vercel → Deployments → Promote/Instant Rollback.
- Supabase: proyecto `cuarto-de-datos` (plan gratuito). Drive: carpeta «Cuarto de datos» en la cuenta personal de Iván.
- PR fusionados: #4 app inicial · #5 variables vacías · #6 cookies httpOnly y keepalive · #7 páginas legales,
  consentimiento y contraste · #8 marca de agua en fondos oscuros, botón Copiar y campo de fecha en Safari ·
  #9 memoria del proyecto y agente revisor. En revisión: PR de identidad BONNY en el ingreso y marca por cliente.
- **Primer cliente que pagó: Harbor Shipping.** Manual de marca en Drive: «BONNY páginas web / CUARTO DE DATOS /
  Cliente - Harbor Shipping». Marca: tipografía **Poppins**; morado `#7036ff`, azul `#1b1589`, azul noche `#1e1e59`,
  lima `#b6ff00`. El manual **prohíbe usar su logo como marca de agua**: la nuestra es solo texto.
- **Identidad BONNY** (decidida con Iván): estilo neutro y sobrio tipo Apple, sin dorados ni efectos; zorro en línea negra;
  lema **«Llave y control»**; títulos en Instrument Serif (cursiva) y texto en DM Sans (no copiar San Francisco).
  Su diseño anterior «Bonny Web – Dirección A» está en su Drive. Logos de Harbor extraídos del manual (vector) en `public/marcas/`.
- **Edificio de cuartos** (decidido): recepción BONNY donde se escribe un **código de 6 dígitos** del cuarto (4 se adivina
  fácil) → login del cuarto (correo + contraseña + 2FA) → interior con la marca del cliente. Cada cliente sigue en su
  instalación separada. Mostrar cuartos por correo se descartó (revela qué empresas audita alguien).
- Dominio elegido: **bonnyanalytics.com** (**aún no comprado**; se compra al final). Plan:
  `bonnyanalytics.com` = web de BONNY, `harbor.bonnyanalytics.com` = cuarto de Harbor, `demo.bonnyanalytics.com` = demo.

### Siguientes pasos acordados
1. **Recepción BONNY** con el código de 6 dígitos y límite de intentos (los códigos equivocados no tienen cuarto donde
   registrarse: no prometer «cada intento queda registrado»).
2. **Instalación separada para Harbor**: Supabase nuevo (recomendado Pro), proyecto Vercel nuevo del mismo
   repositorio, carpeta de Drive nueva (ideal: cuenta de Google exclusiva), subdominio. La instalación actual pasa a
   ser la **demo**. **Nunca borrar el registro** de una instalación: es inalterable por diseño.
3. Pasar Vercel a **Pro** (uso comercial). Crear un segundo administrador. Completar las variables `LEGAL_*` del cliente.
4. Más adelante: la web principal de BONNY en `bonnyanalytics.com`.
5. Cuando Iván lo pida: cuenta u organización de GitHub con la identidad visual de BONNY.

### Riesgos conocidos y pendientes
- Falta verificar en Safari de iPad el ingreso con identidad BONNY (desenfoque, `color-mix` requiere Safari 16.2+, cursivas).
- El repositorio es **público**: este archivo y los logos de `public/marcas/` revelan quiénes son clientes y se sirven
  sin sesión en todas las instalaciones. Recomendado: pasar el repositorio a privado.
- Faltan por verificar en Safari de iPad: el método alternativo del botón Copiar y el ancho del campo de fecha (PR #8).
- La mejora de «ocultar al instante al pulsar ⌘» se descartó: no se puede verificar desde el entorno de pruebas.
- Supabase gratuito no hace copias de seguridad: exportar el registro con regularidad.
- Contrato de transmisión de datos (Decreto 1377, art. 25) y facturación: BONNY no está constituida; definir quién factura.
