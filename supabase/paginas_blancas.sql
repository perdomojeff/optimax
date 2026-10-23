-- StrataFlow · Páginas Blancas (directorio corporativo + chat interno)
-- Disponible para TODOS los roles activos: admin, gerente, analista, lector y sai.
-- Modelo:
--   pb_fichas      ficha por trabajador (datos completos; solo el dueño y admin/gerente la leen directo)
--   pb_directorio  vista que entrega a todos la ficha con los campos privados enmascarados
--   pb_mensajes    chat 1 a 1; solo lo ven remitente y destinatario
--   pb_auditoria   quién cambió qué y cuándo (solo admin/gerente)
--   storage 'pb-adjuntos' (privado) para adjuntos del chat

-- ---------- helpers ----------
create or replace function public.pb_rol() returns text
language sql stable security definer set search_path = '' as $$
  select (select role from public.profiles where user_id = (select auth.uid()) and activo)::text
$$;
create or replace function public.pb_es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.pb_rol() in ('admin','gerente'), false)
$$;
revoke all on function public.pb_rol(), public.pb_es_admin() from public, anon;
grant execute on function public.pb_rol(), public.pb_es_admin() to authenticated;

-- ---------- fichas ----------
create table if not exists public.pb_fichas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  nombres text not null check (length(btrim(nombres)) between 1 and 80),
  apellidos text not null default '' check (length(apellidos) <= 80),
  cargo text not null default '' check (length(cargo) <= 100),
  departamento text not null default '' check (length(departamento) <= 80),
  sede text not null default '' check (length(sede) <= 80),
  jefe_id uuid references public.pb_fichas(id) on delete set null,
  correo text not null default '' check (length(correo) <= 160),
  telefono text not null default '' check (length(telefono) <= 40),
  extension text not null default '' check (length(extension) <= 12),
  celular text not null default '' check (length(celular) <= 40),
  whatsapp text not null default '' check (length(whatsapp) <= 40),
  foto text check (foto is null or (length(foto) <= 120000 and foto like 'data:image/%')),
  fecha_ingreso date,
  idiomas text[] not null default '{}',
  habilidades text[] not null default '{}',
  biografia text not null default '' check (length(biografia) <= 1000),
  estado text not null default 'disponible' check (estado in ('disponible','ocupado','ausente')),
  visibilidad jsonb not null default '{"correo":true,"telefono":true,"celular":false,"whatsapp":false,"fecha_ingreso":false,"biografia":true}',
  activo boolean not null default true,
  demo boolean not null default false,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);
create index if not exists pb_fichas_activo_idx on public.pb_fichas(activo);
alter table public.pb_fichas enable row level security;

drop policy if exists "pb_fichas lectura propia o admin" on public.pb_fichas;
create policy "pb_fichas lectura propia o admin" on public.pb_fichas for select to authenticated
  using (user_id = (select auth.uid()) or (select public.pb_es_admin()));
drop policy if exists "pb_fichas alta" on public.pb_fichas;
create policy "pb_fichas alta" on public.pb_fichas for insert to authenticated
  with check ((select public.pb_es_admin()) or (user_id = (select auth.uid()) and (select public.pb_rol()) is not null));
drop policy if exists "pb_fichas edicion" on public.pb_fichas;
create policy "pb_fichas edicion" on public.pb_fichas for update to authenticated
  using (user_id = (select auth.uid()) or (select public.pb_es_admin()))
  with check (user_id = (select auth.uid()) or (select public.pb_es_admin()));
-- sin politica DELETE: las fichas se desactivan, no se borran

create or replace function public.pb_ficha_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.actualizado := now();
  new.actualizado_por := auth.uid();
  if tg_op = 'UPDATE' and not public.pb_es_admin() and auth.uid() is not null then
    new.user_id := old.user_id;     -- el trabajador no puede reasignar su ficha
    new.activo := old.activo;       -- ni desactivarse / reactivarse
    new.demo := old.demo;
  end if;
  if tg_op = 'INSERT' and not public.pb_es_admin() and auth.uid() is not null then
    new.demo := false; new.activo := true;
  end if;
  return new;
end $$;
drop trigger if exists pb_ficha_guard_t on public.pb_fichas;
create trigger pb_ficha_guard_t before insert or update on public.pb_fichas for each row execute function public.pb_ficha_guard();

-- ---------- auditoría ----------
create table if not exists public.pb_auditoria (
  id bigint generated always as identity primary key,
  ficha_id uuid, usuario uuid, accion text not null, campos text[] not null default '{}', creado timestamptz not null default now()
);
alter table public.pb_auditoria enable row level security;
drop policy if exists "pb_auditoria lectura admin" on public.pb_auditoria;
create policy "pb_auditoria lectura admin" on public.pb_auditoria for select to authenticated using ((select public.pb_es_admin()));
create or replace function public.pb_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare campos text[];
begin
  if tg_op = 'INSERT' then
    insert into public.pb_auditoria(ficha_id, usuario, accion) values (new.id, auth.uid(), 'crear');
  else
    select coalesce(array_agg(k), '{}') into campos from jsonb_each(to_jsonb(new)) n(k, v)
      where k not in ('actualizado','actualizado_por') and v is distinct from (to_jsonb(old) -> k);
    if array_length(campos, 1) > 0 then
      insert into public.pb_auditoria(ficha_id, usuario, accion, campos)
      values (new.id, auth.uid(), case when 'activo' = any(campos) then (case when new.activo then 'reactivar' else 'desactivar' end) else 'editar' end, campos);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists pb_audit_t on public.pb_fichas;
create trigger pb_audit_t after insert or update on public.pb_fichas for each row execute function public.pb_audit();

-- ---------- directorio (vista con privacidad por campo) ----------
create or replace function public.pb_ve(f public.pb_fichas, k text) returns boolean
language sql stable security definer set search_path = '' as $$
  select f.user_id = (select auth.uid()) or public.pb_es_admin() or coalesce((f.visibilidad ->> k)::boolean, false)
$$;
revoke all on function public.pb_ve(public.pb_fichas, text) from public, anon;
grant execute on function public.pb_ve(public.pb_fichas, text) to authenticated;

drop view if exists public.pb_directorio;
create view public.pb_directorio with (security_invoker = false) as
select f.id, f.user_id, f.nombres, f.apellidos, f.cargo, f.departamento, f.sede, f.jefe_id, f.foto, f.estado,
       f.idiomas, f.habilidades, f.activo, f.demo, f.visibilidad,
       case when public.pb_ve(f, 'correo') then f.correo else '' end as correo,
       case when public.pb_ve(f, 'telefono') then f.telefono else '' end as telefono,
       case when public.pb_ve(f, 'telefono') then f.extension else '' end as extension,
       case when public.pb_ve(f, 'celular') then f.celular else '' end as celular,
       case when public.pb_ve(f, 'whatsapp') then f.whatsapp else '' end as whatsapp,
       case when public.pb_ve(f, 'fecha_ingreso') then f.fecha_ingreso end as fecha_ingreso,
       case when public.pb_ve(f, 'biografia') then f.biografia else '' end as biografia,
       f.actualizado
from public.pb_fichas f
where (select public.pb_rol()) is not null
  and (f.activo or f.user_id = (select auth.uid()) or (select public.pb_es_admin()));
revoke all on public.pb_directorio from public, anon;
grant select on public.pb_directorio to authenticated;

-- ---------- mensajes ----------
create or replace function public.pb_puede_recibir(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pb_fichas f where f.user_id = uid and f.activo)
$$;
revoke all on function public.pb_puede_recibir(uuid) from public, anon;
grant execute on function public.pb_puede_recibir(uuid) to authenticated;

create table if not exists public.pb_mensajes (
  id uuid primary key default gen_random_uuid(),
  de uuid not null references auth.users(id) on delete cascade,
  para uuid not null references auth.users(id) on delete cascade,
  cuerpo text not null default '' check (length(cuerpo) <= 4000),
  adjunto jsonb check (adjunto is null or (adjunto ? 'path' and adjunto ? 'name' and length(adjunto::text) < 1000)),
  creado timestamptz not null default now(),
  entregado_en timestamptz,
  leido_en timestamptz,
  check (de <> para),
  check (length(btrim(cuerpo)) > 0 or adjunto is not null)
);
create index if not exists pb_mensajes_par_idx on public.pb_mensajes(de, para, creado desc);
create index if not exists pb_mensajes_para_idx on public.pb_mensajes(para, leido_en);
alter table public.pb_mensajes enable row level security;

drop policy if exists "pb_mensajes lectura participantes" on public.pb_mensajes;
create policy "pb_mensajes lectura participantes" on public.pb_mensajes for select to authenticated
  using ((select public.pb_rol()) is not null and (de = (select auth.uid()) or para = (select auth.uid())));
drop policy if exists "pb_mensajes envio" on public.pb_mensajes;
create policy "pb_mensajes envio" on public.pb_mensajes for insert to authenticated
  with check (
    (select public.pb_rol()) is not null and de = (select auth.uid())
    and (select public.pb_puede_recibir(para))
    and (adjunto is null or (adjunto ->> 'path') like (select auth.uid())::text || '/%'));
drop policy if exists "pb_mensajes recibo" on public.pb_mensajes;
create policy "pb_mensajes recibo" on public.pb_mensajes for update to authenticated
  using (para = (select auth.uid()) and (select public.pb_rol()) is not null)
  with check (para = (select auth.uid()));
-- sin DELETE: el historial no se borra

create or replace function public.pb_msg_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and (new.id, new.de, new.para, new.cuerpo, new.adjunto, new.creado)
     is distinct from (old.id, old.de, old.para, old.cuerpo, old.adjunto, old.creado) then
    raise exception 'solo se puede marcar entregado o leido';
  end if;
  return new;
end $$;
drop trigger if exists pb_msg_guard_t on public.pb_mensajes;
create trigger pb_msg_guard_t before update on public.pb_mensajes for each row execute function public.pb_msg_guard();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pb_mensajes') then
    alter publication supabase_realtime add table public.pb_mensajes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pb_fichas') then
    -- (no se publica pb_fichas: contiene campos privados; el directorio se refresca por consulta)
    null;
  end if;
end $$;

-- ---------- adjuntos del chat (bucket privado) ----------
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('pb-adjuntos', 'pb-adjuntos', false, 26214400,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

drop policy if exists "pb adjuntos subir" on storage.objects;
create policy "pb adjuntos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'pb-adjuntos' and (select public.pb_rol()) is not null
              and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "pb adjuntos leer" on storage.objects;
create policy "pb adjuntos leer" on storage.objects for select to authenticated
  using (bucket_id = 'pb-adjuntos' and (select public.pb_rol()) is not null
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or exists (select 1 from public.pb_mensajes m where m.adjunto ->> 'path' = name and m.para = (select auth.uid()))));
-- Nota: la politica restrictiva existente "sai sin acceso" sobre storage.objects bloquea a SAI;
-- se reemplaza para que SAI solo pueda leer el bucket pb-adjuntos.
drop policy if exists "sai sin acceso" on storage.objects;
create policy "sai sin acceso" on storage.objects as restrictive for select to authenticated
  using (coalesce((select public.current_app_role()::text), '') <> 'sai' or bucket_id = 'pb-adjuntos');

-- ---------- permisos de tabla (RLS decide las filas) ----------
revoke all on public.pb_fichas, public.pb_mensajes, public.pb_auditoria from anon;
grant select, insert, update on public.pb_fichas to authenticated;
grant select, insert, update on public.pb_mensajes to authenticated;
grant select on public.pb_auditoria to authenticated;

-- ---------- una ficha por cada cuenta ----------
create or replace function public.pb_ficha_desde_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pb_fichas(user_id, nombres, apellidos, correo, activo)
    values (new.user_id, coalesce(nullif(btrim(new.nombre), ''), split_part(new.email, '@', 1)), coalesce(new.apellido, ''), coalesce(new.email, ''), new.activo)
    on conflict (user_id) do nothing;
  else
    update public.pb_fichas set activo = new.activo where user_id = new.user_id and activo is distinct from new.activo;
  end if;
  return null;
end $$;
drop trigger if exists pb_ficha_perfil_t on public.profiles;
create trigger pb_ficha_perfil_t after insert or update of activo on public.profiles for each row execute function public.pb_ficha_desde_perfil();

insert into public.pb_fichas(user_id, nombres, apellidos, correo, activo)
select p.user_id, coalesce(nullif(btrim(p.nombre), ''), split_part(p.email, '@', 1)), coalesce(p.apellido, ''), coalesce(p.email, ''), p.activo
from public.profiles p on conflict (user_id) do nothing;

-- ---------- datos de ejemplo (ficticios, sin cuenta; el administrador puede desactivarlos) ----------
insert into public.pb_fichas(nombres, apellidos, cargo, departamento, sede, correo, telefono, extension, celular, fecha_ingreso, idiomas, habilidades, biografia, estado, demo)
select * from (values
 ('Valeria','Montenegro','Directora General','Dirección','Caracas','v.montenegro@ejemplo.test','+58 212 555 0101','101','+58 414 555 0101','2015-03-02'::date,array['Español','Inglés'],array['Estrategia','Liderazgo'],'Perfil ficticio de ejemplo.','disponible',true),
 ('Andrés','Cifuentes','Gerente de Producción','Producción','Maracaibo','a.cifuentes@ejemplo.test','+58 261 555 0102','210','+58 414 555 0102','2016-06-13'::date,array['Español','Inglés'],array['Optimización de producción','Levantamiento artificial'],'Perfil ficticio de ejemplo.','ocupado',true),
 ('Mariana','Quintero','Ingeniera de Yacimientos','Yacimientos','Maracaibo','m.quintero@ejemplo.test','+58 261 555 0103','215','+58 424 555 0103','2018-01-22'::date,array['Español','Inglés','Portugués'],array['Simulación','Análisis de declinación'],'Perfil ficticio de ejemplo.','disponible',true),
 ('Rafael','Bermúdez','Ingeniero de Pozos','Perforación','Anaco','r.bermudez@ejemplo.test','+58 282 555 0104','320','+58 412 555 0104','2017-09-04'::date,array['Español'],array['Completación','Reacondicionamiento'],'Perfil ficticio de ejemplo.','ausente',true),
 ('Carolina','Salazar','Analista de Datos','Tecnología','Caracas','c.salazar@ejemplo.test','+58 212 555 0105','130','+58 416 555 0105','2020-02-10'::date,array['Español','Inglés'],array['SQL','Power BI','Python'],'Perfil ficticio de ejemplo.','disponible',true),
 ('Luis','Peñaloza','Supervisor de Facilidades','Operaciones','Anaco','l.penaloza@ejemplo.test','+58 282 555 0106','330','+58 414 555 0106','2014-11-17'::date,array['Español'],array['Mantenimiento','Seguridad industrial'],'Perfil ficticio de ejemplo.','ocupado',true),
 ('Daniela','Ferrer','Geóloga Senior','Geociencias','Maracaibo','d.ferrer@ejemplo.test','+58 261 555 0107','225','+58 426 555 0107','2016-04-25'::date,array['Español','Inglés'],array['Petrofísica','Modelo estático'],'Perfil ficticio de ejemplo.','disponible',true),
 ('José','Arismendi','Coordinador de Recursos Humanos','Recursos Humanos','Caracas','j.arismendi@ejemplo.test','+58 212 555 0108','140','+58 412 555 0108','2013-08-05'::date,array['Español'],array['Selección','Nómina'],'Perfil ficticio de ejemplo.','disponible',true),
 ('Patricia','Villalobos','Contadora','Finanzas','Caracas','p.villalobos@ejemplo.test','+58 212 555 0109','150','+58 414 555 0109','2019-05-13'::date,array['Español','Inglés'],array['Costos','Presupuesto'],'Perfil ficticio de ejemplo.','ausente',true),
 ('Gabriel','Contreras','Técnico de Campo','Operaciones','Maracaibo','g.contreras@ejemplo.test','+58 261 555 0110','260','+58 416 555 0110','2021-03-08'::date,array['Español'],array['Medición de pozos','Registros de presión'],'Perfil ficticio de ejemplo.','disponible',true),
 ('Isabel','Maldonado','Asesora Legal','Legal','Caracas','i.maldonado@ejemplo.test','+58 212 555 0111','160','+58 424 555 0111','2018-10-01'::date,array['Español','Inglés','Francés'],array['Contratos','Cumplimiento'],'Perfil ficticio de ejemplo.','ocupado',true),
 ('Héctor','Zambrano','Analista de Evaluación Económica','Finanzas','Puerto La Cruz','h.zambrano@ejemplo.test','+58 281 555 0112','410','+58 414 555 0112','2022-01-17'::date,array['Español','Inglés'],array['VPN y TIR','Análisis de riesgo'],'Perfil ficticio de ejemplo.','disponible',true),
 ('Natalia','Rondón','Ingeniera de Producción','Producción','Puerto La Cruz','n.rondon@ejemplo.test','+58 281 555 0113','415','+58 412 555 0113','2019-07-29'::date,array['Español','Inglés'],array['Análisis nodal','Gas lift'],'Perfil ficticio de ejemplo.','disponible',true),
 ('Óscar','Delgado','Especialista en HSE','Seguridad y Ambiente','Anaco','o.delgado@ejemplo.test','+58 282 555 0114','340','+58 416 555 0114','2015-12-07'::date,array['Español'],array['Auditorías HSE','Planes de respuesta'],'Perfil ficticio de ejemplo.','ausente',true)
) v(nombres,apellidos,cargo,departamento,sede,correo,telefono,extension,celular,fecha_ingreso,idiomas,habilidades,biografia,estado,demo)
where not exists (select 1 from public.pb_fichas where demo);

update public.pb_fichas f set jefe_id = j.id
from public.pb_fichas j
where f.demo and j.demo and f.jefe_id is null and (
  (f.apellidos in ('Cifuentes','Salazar','Arismendi','Villalobos','Maldonado') and j.apellidos = 'Montenegro') or
  (f.apellidos in ('Quintero','Rondón','Contreras','Peñaloza') and j.apellidos = 'Cifuentes') or
  (f.apellidos in ('Ferrer') and j.apellidos = 'Quintero') or
  (f.apellidos in ('Bermúdez') and j.apellidos = 'Cifuentes') or
  (f.apellidos in ('Zambrano') and j.apellidos = 'Villalobos') or
  (f.apellidos in ('Delgado') and j.apellidos = 'Peñaloza'));
