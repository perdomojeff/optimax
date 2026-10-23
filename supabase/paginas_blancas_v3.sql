-- =====================================================================
-- StrataFlow · Páginas Blancas · v3
--   1) Catálogo cerrado Gerencia → Departamento (lista de selección en la ficha)
--   2) Nivel organizacional (miembro / líder de departamento / gerente), asignado solo por administración
--   3) Anuncios (comunicados informativos, no son chat) por gerencia, departamento, supervisados o una selección
-- Requiere haber ejecutado paginas_blancas.sql y paginas_blancas_v2.sql. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------- 1. catálogo de gerencias y departamentos ----------
create table if not exists public.pb_estructura (
  gerencia text not null check (length(gerencia) between 1 and 80),
  departamento text not null check (length(departamento) between 1 and 80),
  orden int not null default 0,
  primary key (gerencia, departamento)
);
alter table public.pb_estructura enable row level security;
drop policy if exists "pb_estructura lectura" on public.pb_estructura;
create policy "pb_estructura lectura" on public.pb_estructura for select to authenticated using ((select public.pb_rol()) is not null);
revoke all on public.pb_estructura from public, anon;
grant select on public.pb_estructura to authenticated;     -- sin políticas de escritura: se modifica solo con SQL

insert into public.pb_estructura(gerencia, departamento, orden) values
 ('Director of Finance','Contracts & Legal',1),('Director of Finance','Treasury – TBA',2),('Director of Finance','Tax Compliance – TBA',3),
 ('Director of Finance','Tax Reporting – TBA',4),('Director of Finance','Risk Management',5),('Director of Finance','Reporting – TBA',6),
 ('Director of Finance','Assurance – TBA',7),('Director of Finance','HR & Payroll',8),
 ('Project Services Manager','Procurement & Logistics',1),('Project Services Manager','Contracts Manager',2),('Project Services Manager','Scheduling',3),
 ('Project Services Manager','Cost Control',4),('Project Services Manager','Reporting',5),
 ('Strategic Advisory','PMO',1),('Strategic Advisory','Asset Management',2),('Strategic Advisory','Data & Digital',3),
 ('Strategic Advisory','DEXEIY',4),('Strategic Advisory','Reservoir Surveillance',5),('Strategic Advisory','Action Plan for Wells',6),
 ('Facilities E & C','Eng',1),('Facilities E & C','MC Leader',2),('Facilities E & C','Doc Control',3),
 ('Operations Director','Operations Team',1),('Operations Director','Planning & Logistics',2),('Operations Director','Supply Chain',3),
 ('Well Delivery Manager','AGSM Team',1),('Well Delivery Manager','Drilling Team',2),
 ('QA Manager','Pmt Procedures & Compliance',1),('QA Manager','Inspection',2),
 ('HSE Manager','Environmental Compliance',1),('HSE Manager','Occupational Safety',2),
 ('Third Parties Manager (PDVSA & Gov)','Permitting',1),('Third Parties Manager (PDVSA & Gov)','Regulatory Compliance',2),('Third Parties Manager (PDVSA & Gov)','Community Relations',3)
on conflict (gerencia, departamento) do nothing;

-- ---------- 2. columnas nuevas en la ficha ----------
alter table public.pb_fichas add column if not exists gerencia text not null default '' check (length(gerencia) <= 80);
alter table public.pb_fichas add column if not exists nivel text not null default 'miembro' check (nivel in ('miembro','lider_depto','gerente'));

-- migrar lo escrito a mano antes de exigir la lista cerrada
update public.pb_fichas f set gerencia = m.g, departamento = m.d
from (values
  ('Data and Digital','Strategic Advisory','Data & Digital'),
  ('Producción','Operations Director','Operations Team'),
  ('Operaciones','Operations Director','Operations Team'),
  ('Yacimientos','Strategic Advisory','Reservoir Surveillance'),
  ('Geociencias','Strategic Advisory','Asset Management'),
  ('Tecnología','Strategic Advisory','Data & Digital'),
  ('Perforación','Well Delivery Manager','Drilling Team'),
  ('Recursos Humanos','Director of Finance','HR & Payroll'),
  ('Finanzas','Director of Finance','Reporting – TBA'),
  ('Legal','Director of Finance','Contracts & Legal'),
  ('Seguridad y Ambiente','HSE Manager','Environmental Compliance')
) m(viejo, g, d)
where f.gerencia = '' and lower(btrim(f.departamento)) = lower(m.viejo);
-- lo que no coincida con el catálogo queda sin asignar (cada trabajador lo elige de la lista)
update public.pb_fichas f set gerencia = '', departamento = ''
where not exists (select 1 from public.pb_estructura e where e.gerencia = f.gerencia and e.departamento = f.departamento);

create or replace function public.pb_ficha_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.actualizado := now();
  new.actualizado_por := auth.uid();
  new.gerencia := btrim(coalesce(new.gerencia, ''));
  new.departamento := btrim(coalesce(new.departamento, ''));
  if tg_op = 'UPDATE' and not public.pb_es_admin() and auth.uid() is not null then
    new.user_id := old.user_id;     -- el trabajador no puede reasignar su ficha
    new.activo := old.activo;       -- ni desactivarse / reactivarse
    new.demo := old.demo;
    new.nivel := old.nivel;         -- el nivel (líder/gerente) lo asigna solo administración
    if old.nivel <> 'miembro' and (new.gerencia is distinct from old.gerencia or new.departamento is distinct from old.departamento) then
      raise exception 'Solo administración puede cambiar la gerencia o el departamento de un líder.';
    end if;
  end if;
  if tg_op = 'INSERT' and not public.pb_es_admin() and auth.uid() is not null then
    new.demo := false; new.activo := true; new.nivel := 'miembro';
  end if;
  -- gerencia y departamento: solo valores del catálogo
  if new.departamento <> '' and new.gerencia = '' then raise exception 'Elige primero la gerencia.'; end if;
  if new.gerencia <> '' and not exists (select 1 from public.pb_estructura e where e.gerencia = new.gerencia) then
    raise exception 'Gerencia no válida: elige una de la lista.'; end if;
  if new.departamento <> '' and not exists (select 1 from public.pb_estructura e where e.gerencia = new.gerencia and e.departamento = new.departamento) then
    raise exception 'Departamento no válido para esa gerencia: elige uno de la lista.'; end if;
  if new.nivel = 'gerente' and new.gerencia = '' then raise exception 'Un gerente debe tener una gerencia asignada.'; end if;
  if new.nivel = 'lider_depto' and new.departamento = '' then raise exception 'Un líder de departamento debe tener un departamento asignado.'; end if;
  return new;
end $$;

-- directorio con los campos nuevos (públicos, como el departamento)
drop view if exists public.pb_directorio;
create view public.pb_directorio with (security_invoker = false) as
select f.id, f.user_id, f.nombres, f.apellidos, f.cargo, f.gerencia, f.departamento, f.nivel, f.sede, f.jefe_id, f.foto, f.estado,
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

-- ---------- 3. alcance: a quién puede dirigir anuncios cada persona ----------
--  · administrador (rol admin): a todos
--  · gerente (nivel): a toda su gerencia · líder de departamento: a todo su departamento
--  · cualquiera con supervisados: a sus supervisados directos e indirectos
create or replace function public.pb_alcance() returns setof uuid
language sql stable security definer set search_path = '' as $$
  with recursive me as (
    select * from public.pb_fichas where user_id = (select auth.uid()) and activo
  ), t(id) as (
    select f.id from public.pb_fichas f join me on f.jefe_id = me.id
    union
    select f.id from public.pb_fichas f join t on f.jefe_id = t.id
  )
  select distinct f.user_id from public.pb_fichas f
  where f.activo and f.user_id is not null and f.user_id <> (select auth.uid())
    and public.pb_rol() is not null
    and ( public.pb_rol() = 'admin'
       or f.id in (select id from t)
       or exists (select 1 from me where me.nivel = 'gerente' and me.gerencia <> '' and f.gerencia = me.gerencia)
       or exists (select 1 from me where me.nivel = 'lider_depto' and me.departamento <> '' and f.gerencia = me.gerencia and f.departamento = me.departamento) )
$$;
revoke all on function public.pb_alcance() from public, anon;
grant execute on function public.pb_alcance() to authenticated;

-- ---------- anuncios ----------
create table if not exists public.pb_anuncios (
  id uuid primary key default gen_random_uuid(),
  de uuid not null references auth.users(id) on delete cascade,
  titulo text not null check (length(btrim(titulo)) between 1 and 120),
  cuerpo text not null check (length(btrim(cuerpo)) between 1 and 4000),
  audiencia text not null default '' check (length(audiencia) <= 120),
  creado timestamptz not null default now()
);
create table if not exists public.pb_anuncio_destinos (
  anuncio_id uuid not null references public.pb_anuncios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  leido_en timestamptz,
  primary key (anuncio_id, user_id)
);
create index if not exists pb_anuncio_destinos_user_idx on public.pb_anuncio_destinos(user_id, anuncio_id);
create index if not exists pb_anuncios_creado_idx on public.pb_anuncios(creado desc);
alter table public.pb_anuncios enable row level security;
alter table public.pb_anuncio_destinos enable row level security;

create or replace function public.pb_es_emisor(aid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pb_anuncios a where a.id = aid and a.de = (select auth.uid()))
$$;
create or replace function public.pb_es_destinatario(aid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pb_anuncio_destinos d where d.anuncio_id = aid and d.user_id = (select auth.uid()))
$$;
revoke all on function public.pb_es_emisor(uuid), public.pb_es_destinatario(uuid) from public, anon;
grant execute on function public.pb_es_emisor(uuid), public.pb_es_destinatario(uuid) to authenticated;

drop policy if exists "pb_anuncios lectura" on public.pb_anuncios;
create policy "pb_anuncios lectura" on public.pb_anuncios for select to authenticated
  using ((select public.pb_rol()) is not null and (de = (select auth.uid()) or (select public.pb_es_destinatario(id))));
drop policy if exists "pb_anuncios borrar" on public.pb_anuncios;
create policy "pb_anuncios borrar" on public.pb_anuncios for delete to authenticated
  using ((select public.pb_rol()) is not null and de = (select auth.uid()));
drop policy if exists "pb_destinos lectura" on public.pb_anuncio_destinos;
create policy "pb_destinos lectura" on public.pb_anuncio_destinos for select to authenticated
  using ((select public.pb_rol()) is not null and (user_id = (select auth.uid()) or (select public.pb_es_emisor(anuncio_id))));
drop policy if exists "pb_destinos leer" on public.pb_anuncio_destinos;
create policy "pb_destinos leer" on public.pb_anuncio_destinos for update to authenticated
  using (user_id = (select auth.uid()) and (select public.pb_rol()) is not null)
  with check (user_id = (select auth.uid()));
revoke all on public.pb_anuncios, public.pb_anuncio_destinos from public, anon, authenticated;
grant select, delete on public.pb_anuncios to authenticated;
grant select on public.pb_anuncio_destinos to authenticated;
grant update (leido_en) on public.pb_anuncio_destinos to authenticated;   -- el destinatario solo puede marcar «leído»

-- Enviar: única vía de alta (no hay INSERT directo). Valida que todos los destinatarios estén dentro del alcance.
create or replace function public.pb_anuncio_enviar(p_titulo text, p_cuerpo text, p_destinos uuid[], p_audiencia text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_dest uuid[]; v_ok int; sec text;
begin
  if auth.uid() is null or public.pb_rol() is null then raise exception 'sin permiso'; end if;
  if length(btrim(coalesce(p_titulo, ''))) not between 1 and 120 then raise exception 'El título es obligatorio (máximo 120 caracteres).'; end if;
  if length(btrim(coalesce(p_cuerpo, ''))) not between 1 and 4000 then raise exception 'El mensaje es obligatorio (máximo 4.000 caracteres).'; end if;
  select array_agg(distinct d) into v_dest from unnest(coalesce(p_destinos, '{}'::uuid[])) d where d is not null;
  if v_dest is null then raise exception 'Elige al menos un destinatario.'; end if;
  if array_length(v_dest, 1) > 1000 then raise exception 'Máximo 1.000 destinatarios por anuncio.'; end if;
  select count(*) into v_ok from unnest(v_dest) d where d in (select public.pb_alcance());
  if v_ok <> array_length(v_dest, 1) then raise exception 'Algunos destinatarios están fuera de tu alcance.'; end if;
  insert into public.pb_anuncios(de, titulo, cuerpo, audiencia)
    values (auth.uid(), btrim(p_titulo), btrim(p_cuerpo), left(coalesce(p_audiencia, ''), 120)) returning id into v_id;
  insert into public.pb_anuncio_destinos(anuncio_id, user_id) select v_id, d from unnest(v_dest) d;
  begin   -- aviso push: nunca bloquea el envío
    select value into sec from public.pb_config where key = 'webhook_secret';
    perform net.http_post(
      url := 'https://gwczlpofvxihdsvzggcg.supabase.co/functions/v1/pb-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-pb-secret', sec),
      body := jsonb_build_object('anuncio_id', v_id), timeout_milliseconds := 5000);
  exception when others then null;
  end;
  return v_id;
end $$;
revoke all on function public.pb_anuncio_enviar(text, text, uuid[], text) from public, anon;
grant execute on function public.pb_anuncio_enviar(text, text, uuid[], text) to authenticated;

-- tiempo real para los destinatarios
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pb_anuncio_destinos') then
    alter publication supabase_realtime add table public.pb_anuncio_destinos;
  end if;
end $$;
