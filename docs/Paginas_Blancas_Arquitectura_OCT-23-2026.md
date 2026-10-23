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
- Chats grupales y notificaciones push: ver secciones 5 y 5.1 (`supabase/paginas_blancas_v2.sql`).

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

### Cómo funciona
```
Cliente (app instalada o pestaña) ──suscribe──► pb_push (endpoint, claves, ajustes del dispositivo)
Nuevo mensaje en pb_mensajes ──► disparador SQL pb_notificar() ──► función Edge «pb-push» (Supabase)
pb-push ──► servicio push del navegador (FCM / Mozilla / Apple) ──► service worker (sw.js) ──► notificación ──► toque ──► abre el chat
```
- **Claves VAPID:** la función las genera sola la primera vez y las guarda en `pb_config`, tabla sin acceso para usuarios. Nunca pasan por el código del cliente ni por el repositorio. La clave pública se obtiene con un `GET` a la función.
- **Autenticación del disparador:** secreto compartido (`pb_config.webhook_secret`, generado en SQL) en el encabezado `x-pb-secret`.
- **Qué recibe el destinatario:** remitente (y nombre del grupo), vista previa opcional, un aviso por conversación (`tag`) y, al tocarlo, se abre esa conversación. Si el trabajador está mirando la aplicación, el aviso no se duplica.
- **Ajustes por dispositivo:** vista previa, chats silenciados y «no molestar» se sincronizan con `pb_push` desde el botón «Notificaciones».
- **Limpieza:** las suscripciones que respondan 404/410 se eliminan solas; cada dispositivo pertenece a quien inició sesión último.
- **Varios dispositivos** por trabajador; se activan y desactivan en cada uno.

### Puesta en marcha
1. Ejecutar `supabase/paginas_blancas_v2.sql` en el editor SQL del proyecto.
2. Desplegar la función `supabase/functions/pb-push/index.ts` con **Verify JWT desactivado** (Edge Functions → pb-push).
3. Cada trabajador abre Páginas Blancas → Notificaciones → «Activar notificaciones en este dispositivo».

### Limitaciones
- Ningún navegador garantiza entrega instantánea; el sistema operativo puede retrasar avisos por ahorro de batería. En Android conviene instalar la aplicación y excluir el navegador del ahorro de batería.
- iPhone/iPad solo reciben push con la app instalada («Añadir a pantalla de inicio») y iOS 16.4 o superior.
- Si el navegador se cierra por completo en escritorio, el aviso llega solo si el navegador tiene permiso para ejecutarse en segundo plano.

### Guía de instalación para trabajadores
- **iPhone/iPad (iOS 16.4 o superior):** abrir StrataFlow en **Safari** → Compartir → «Añadir a pantalla de inicio» → abrir la app desde el ícono → Páginas Blancas → Notificaciones → «Activar notificaciones en este dispositivo».
- **Android (Chrome/Edge/Samsung Internet):** menú ⋮ → «Instalar aplicación» → abrir desde el ícono → activar notificaciones.
- **Escritorio:** Páginas Blancas → Notificaciones → activar y permitir cuando el navegador lo pida.

## 5.1 Chats grupales
- Cualquier trabajador puede crear un grupo (hasta 50 miembros). El creador y administración agregan o quitan miembros y cambian el nombre; cada miembro puede salir.
- Los mensajes del grupo solo los ven sus miembros (administración puede ver el grupo y sus miembros, no los mensajes). Los adjuntos también quedan limitados a los miembros.
- Tablas: `pb_grupos`, `pb_grupo_miembros`, `pb_grupo_lecturas` (no leídos por persona).
- Aviso «está escribiendo…» en chats directos y de grupo, con varios nombres cuando escriben varias personas.

## 5.2 Gerencias y departamentos (lista cerrada)
- Catálogo oficial en `pb_estructura` (9 gerencias y 34 departamentos, tomados del organigrama de SAI Group International). Lo leen todos los roles; solo se modifica con SQL.
- En la ficha, «Gerencia» y «Departamento» son listas de selección (el departamento depende de la gerencia). No hay texto libre; además lo valida el servidor, así que ni la importación CSV ni el API aceptan valores fuera de la lista.
- «Nivel en la organización» (miembro, líder de departamento, gerente de la gerencia) lo asigna solo administración. Un trabajador no puede ascenderse a sí mismo ni cambiar la gerencia o el departamento de un líder.
- El directorio y la importación CSV incluyen la columna `gerencia`; el directorio tiene filtros por gerencia y departamento.

## 5.3 Anuncios (comunicados informativos)
- No son un chat: el destinatario los recibe en la pestaña «Anuncios» y como notificación, sin conversación en cadena. El remitente ve cuántos los han leído.
- **Quién puede anunciar a quién** (calculado en el servidor, `pb_alcance()`):
  - cualquier persona con supervisados: a sus supervisados directos e indirectos;
  - gerente (nivel): a toda su gerencia; líder de departamento: a todo su departamento;
  - rol `admin`: a todos los trabajadores activos con cuenta.
- Audiencias predeterminadas en el selector (todos los que alcanza, mis supervisados, cada gerencia, cada departamento) y ajuste persona por persona.
- El envío pasa por `pb_anuncio_enviar()`, que rechaza cualquier destinatario fuera del alcance del remitente. Las tablas `pb_anuncios` y `pb_anuncio_destinos` no aceptan inserciones directas; el destinatario solo puede marcar «leído».
- Push: el mismo servicio `pb-push` envía un aviso por anuncio (actualizar la función con la versión nueva).
- Instalación: ejecutar `supabase/paginas_blancas_v3.sql` (antes de publicar el código) y volver a publicar `pb-push`.

## 6. Siguientes fases propuestas
1. «Visto por» en grupos y respuestas a mensajes específicos.
4. Sincronización con directorio activo / SSO para crear y desactivar fichas automáticamente.
5. Notificaciones externas (correo o WhatsApp) para mensajes sin leer.
