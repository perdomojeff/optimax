# StrataFlow · Páginas Blancas — arquitectura, pruebas y notificaciones

## 1. Análisis previo y decisiones de integración

- StrataFlow es una página estática en Vercel (`public/index.html`, inicio de sesión con Supabase Auth). Tras el acceso, `api/app.js` valida el token y el perfil activo y entrega `private/strataflow.html` (React 18 por CDN) o, para el rol `sai`, `private/pm.html`.
- Los roles viven en `profiles.role` (`admin`, `gerente`, `analista`, `lector`, `sai`) y la seguridad real es RLS en Supabase mediante `current_app_role()`.
- Los lectores no pueden leer otros perfiles ni la tabla compartida `app_docs` en escritura, y `app_docs` es legible por todos los autenticados. Por eso el módulo **no** usa `app_docs`: un chat ahí sería legible por cualquiera. Se crearon tablas propias con RLS por participante.
- El módulo es un único código (`private/pb.js`, `pb-ui.js`, `pb-app.js`) que `api/app.js` inyecta en `strataflow.html` y en `pm.html`. Así está disponible para **todos los roles activos, incluido SAI**, sin entregarle a SAI el paquete completo de StrataFlow.
- SAI sigue sin acceso a cualquier otra tabla: las políticas restrictivas «sai sin acceso» se mantienen; solo se agrega permiso explícito a las tablas `pb_*` y al bucket `pb-adjuntos`.
- Estilos: variables del tema StrataFlow (`--bg`, `--panel`, `--accent`…) con valores de respaldo; clases con prefijo `pb-` para no tocar el resto.
- Cambios en código existente (mínimos): `api/app.js` (inyección del módulo), `strataflow.html` (pestaña, insignia de no leídos, subtítulo), `pm.html` (segunda pestaña), `public/index.html` (manifiesto y service worker).

## 2. Modelo de datos (Supabase)

| Objeto | Función |
|---|---|
| `pb_fichas` | Ficha por trabajador (nombres, apellidos, cargo, departamento, sede, jefe, correo, teléfono, extensión, celular, WhatsApp, foto, fecha de ingreso, idiomas, habilidades, biografía, estado, `visibilidad` por campo, `activo`, `demo`). Solo el dueño y admin/gerente la leen directamente. No existe DELETE: se desactiva. |
| `pb_directorio` (vista) | Lo que ven los demás: los campos privados llegan vacíos según `visibilidad`. Excluye fichas desactivadas salvo para el dueño y administración. |
| `pb_mensajes` | Chat 1 a 1 (`de`, `para`, `cuerpo`, `adjunto`, `creado`, `entregado_en`, `leido_en`). Solo lo ven remitente y destinatario; no se edita ni se borra; el destinatario solo puede marcar entregado/leído. |
| `pb_auditoria` | Quién, qué campos y cuándo en cada ficha (visible solo para admin/gerente). |
| Bucket `pb-adjuntos` | Privado, 25 MB por archivo, tipos permitidos (PDF, imágenes, Word, Excel, PowerPoint, TXT, CSV). Lectura solo del remitente y del destinatario. |

- Cada cuenta nueva recibe su ficha automáticamente (trigger sobre `profiles`). Se incluyen 14 fichas **ficticias** de ejemplo (`demo = true`, sin cuenta; el administrador puede desactivarlas).
- Departamentos y sedes son catálogos dinámicos: salen de los valores escritos en las fichas.
- Conversaciones grupales (fase 2): agregar `pb_conversaciones` y `pb_participantes` y cambiar `para` por `conversacion_id`; la interfaz ya agrupa por conversación.

## 3. Supuestos y limitaciones

- Tiempo real con Supabase Realtime (cambios en `pb_mensajes`), presencia en línea y «escribiendo…» por canal de difusión; además hay recarga de respaldo cada 60 s.
- La fotografía se recorta a 192 × 192 px, se comprime a WebP y se guarda en la propia ficha (máx. ~120 KB).
- Los adjuntos de hasta 25 MB dependen de que el límite global de carga del proyecto Supabase sea de 25 MB o más (Ajustes → Storage). En el plan gratuito el máximo es 50 MB.
- Importación/exportación en CSV (Excel lo abre y lo guarda como «CSV UTF-8»); no se lee .xlsx directamente.
- La lista usa carga progresiva (24 y luego 48 más); con miles de fichas conviene virtualizar.
- La interfaz del módulo está solo en español.
- «En línea» se calcula por presencia: si el trabajador tiene StrataFlow abierto; su estado manual (ocupado/ausente) se muestra mientras esté conectado.
- El sistema operativo puede retrasar notificaciones por ahorro de batería; ningún navegador garantiza entrega instantánea.

## 4. Pruebas paso a paso

1. Inicia sesión y abre **Páginas Blancas** (o, como SAI, la segunda pestaña).
2. **Buscar:** escribe «ing» o un apellido; el contador se actualiza. Prueba filtros y el índice A–Z.
3. **Ficha:** toca una tarjeta; verifica Chatear, Llamar, Correo, Copiar contacto y Descargar tarjeta (.vcf).
4. **Editar y foto:** «Mi ficha» → Cambiar fotografía → recorta → Guardar. Desmarca «Celular» en privacidad y confirma, con otra cuenta, que no se muestra.
5. **Chat:** con dos cuentas en dos navegadores, abre una ficha → Chatear → escribe. En el otro navegador debe aparecer el aviso, la insignia en la pestaña y el mensaje; al abrirlo pasa a «leído» (✓✓).
6. **Adjuntos:** clip → elige un PDF (≤ 25 MB). Un archivo mayor o de tipo no permitido se rechaza con mensaje claro.
7. **Administración** (admin/gerente): nueva ficha, importar CSV con vista previa y reporte de errores, exportar, historial de cambios, desactivar/reactivar.

## 5. Notificaciones push y aplicación instalable (PWA)

### Estado actual
- Ya incluido: `manifest.webmanifest`, íconos 192/512/maskable y `sw.js` registrado (instalable en iPhone/iPad con «Añadir a pantalla de inicio» y en Android/escritorio). Avisos dentro de la app, insignia (Badging API) y avisos del navegador con la app abierta o en segundo plano, con vista previa opcional, silenciar chat y «no molestar».
- El `sw.js` ya contiene los manejadores `push` y `notificationclick` (abre la conversación correcta).

### Pendiente (requiere secretos que solo tú puedes crear)
El envío con la aplicación **cerrada** necesita Web Push con claves VAPID y un proceso de servidor:

```
Cliente (app instalada) ──suscribe──► tabla pb_push (endpoint, claves, usuario, dispositivo)
Nuevo mensaje en pb_mensajes ──► Database Webhook (Supabase) ──► /api/push (función serverless, Vercel)
/api/push ──► servicio push del navegador (FCM / Mozilla / Apple) ──► service worker ──► notificación ──► toque ──► abre el chat
```

1. Generar claves: `npx web-push generate-vapid-keys` (la clave **privada** no debe salir de los secretos del servidor).
2. En Vercel → Settings → Environment Variables: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (`mailto:…`) y `PUSH_WEBHOOK_SECRET`.
3. Crear la tabla `pb_push` (con RLS: cada usuario solo ve e inserta sus suscripciones) y el Database Webhook sobre `pb_mensajes` (INSERT) hacia `/api/push` con el secreto en un encabezado.
4. `/api/push` busca las suscripciones del destinatario, omite dispositivos activos en ese chat, envía con la librería `web-push` y elimina suscripciones que respondan 404/410.
5. En el cliente: botón «Activar notificaciones» (gesto del usuario) → `pushManager.subscribe({ applicationServerKey })` → guardar la suscripción.

Esta parte se implementa en la siguiente fase, cuando existan las claves.

### Guía de instalación para trabajadores
- **iPhone/iPad (iOS 16.4 o superior):** abrir StrataFlow en **Safari** → Compartir → «Añadir a pantalla de inicio» → abrir la app desde el ícono → Páginas Blancas → Notificaciones → «Activar notificaciones».
- **Android (Chrome/Edge/Samsung Internet):** menú ⋮ → «Instalar aplicación» (o «Añadir a pantalla de inicio») → abrir desde el ícono → activar notificaciones.

## 6. Siguientes fases propuestas
1. Web Push con la aplicación cerrada (sección 5).
2. Chats grupales por departamento o proyecto.
3. Estados «visto por» y respuestas a mensajes.
4. Sincronización con directorio activo / SSO para crear y desactivar fichas automáticamente.
5. Notificaciones externas (correo o WhatsApp) para mensajes sin leer.
