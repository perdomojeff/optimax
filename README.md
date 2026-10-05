# Optimax
Analizador de reactivación de pozos (Maracaibo / Oriente). Front: Vercel (login Supabase Auth). Datos: Supabase (esquema estrella + app_docs, RLS por rol).
- `public/index.html`: login.  `api/app.js`: entrega la app solo a usuarios autenticados y aprobados.  `private/optimax.html`: bundle (no público).
