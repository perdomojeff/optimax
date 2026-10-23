-- StrataFlow · Páginas Blancas · v2: chats grupales + notificaciones Web Push
-- Requiere haber aplicado antes supabase/paginas_blancas.sql. Es seguro repetirlo.

-- ========== GRUPOS ==========
create table if not exists public.pb_grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  creado_por uuid references auth.users(id) on delete set null,
  creado timestamptz not null default now()
);
create table if not exists public.pb_grupo_miembros (
  grupo_id uuid not null references public.pb_grupos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agregado timestamptz not null default now(),
  primary key (grupo_id, user_id)
);
create index if not exists pb_grupo_miembros_user_idx on public.pb_grupo_miembros(user_id);
create table if not exists public.pb_grupo_lecturas (
  grupo_id uuid not null references public.pb_grupos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  leido_hasta timestamptz not null default now(),
  primary key (grupo_id, user_id)
);
alter table public.pb_grupos enable row level security;
alter table public.pb_grupo_miembros enable row level security;
alter table public.pb_grupo_lecturas enable row level security;

create or replace function public.pb_es_miembro(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pb_grupo_miembros m where m.grupo_id = gid and m.user_id = (select auth.uid()))
$$;
create or replace function public.pb_es_creador(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pb_grupos g where g.id = gid and g.creado_por = (select auth.uid()))
$$;
revoke all on function public.pb_es_miembro(uuid), public.pb_es_creador(uuid) from public, anon;
grant execute on function public.pb_es_miembro(uuid), public.pb_es_creador(uuid) to authenticated;

drop policy if exists "pb_grupos lectura" on public.pb_grupos;
create policy "pb_grupos lectura" on public.pb_grupos for select to authenticated
  using ((select public.pb_rol()) is not null and ((select public.pb_es_miembro(id)) or creado_por = (select auth.uid()) or (select public.pb_es_admin())));
drop policy if exists "pb_grupos alta" on public.pb_grupos;
create policy "pb_grupos alta" on public.pb_grupos for insert to authenticated
  with check ((select public.pb_rol()) is not null and creado_por = (select auth.uid()));
drop policy if exists "pb_grupos renombrar" on public.pb_grupos;
create policy "pb_grupos renombrar" on public.pb_grupos for update to authenticated
  using (creado_por = (select auth.uid()) or (select public.pb_es_admin()))
  with check (creado_por = (select auth.uid()) or (select public.pb_es_admin()));

drop policy if exists "pb_miembros lectura" on public.pb_grupo_miembros;
create policy "pb_miembros lectura" on public.pb_grupo_miembros for select to authenticated
  using ((select public.pb_rol()) is not null and ((select public.pb_es_miembro(grupo_id)) or (select public.pb_es_admin())));
drop policy if exists "pb_miembros alta" on public.pb_grupo_miembros;
create policy "pb_miembros alta" on public.pb_grupo_miembros for insert to authenticated
  with check ((select public.pb_rol()) is not null and ((select public.pb_es_creador(grupo_id)) or (select public.pb_es_admin()))
              and (select public.pb_puede_recibir(user_id)));
drop policy if exists "pb_miembros baja" on public.pb_grupo_miembros;
create policy "pb_miembros baja" on public.pb_grupo_miembros for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.pb_es_creador(grupo_id)) or (select public.pb_es_admin()));

drop policy if exists "pb_lecturas propias" on public.pb_grupo_lecturas;
create policy "pb_lecturas propias" on public.pb_grupo_lecturas for all to authenticated
  using (user_id = (select auth.uid()) and (select public.pb_es_miembro(grupo_id)))
  with check (user_id = (select auth.uid()) and (select public.pb_es_miembro(grupo_id)));

create or replace function public.pb_grupo_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pb_grupo_miembros(grupo_id, user_id) values (new.id, new.creado_por) on conflict do nothing;
  return null;
end $$;
drop trigger if exists pb_grupo_nuevo_t on public.pb_grupos;
create trigger pb_grupo_nuevo_t after insert on public.pb_grupos for each row execute function public.pb_grupo_nuevo();

create or replace function public.pb_miembros_limite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.pb_grupo_miembros where grupo_id = new.grupo_id) >= 50 then
    raise exception 'un grupo admite hasta 50 miembros';
  end if;
  return new;
end $$;
drop trigger if exists pb_miembros_limite_t on public.pb_grupo_miembros;
create trigger pb_miembros_limite_t before insert on public.pb_grupo_miembros for each row execute function public.pb_miembros_limite();

grant select, insert, update on public.pb_grupos to authenticated;
grant select, insert, delete on public.pb_grupo_miembros to authenticated;
grant select, insert, update on public.pb_grupo_lecturas to authenticated;
revoke all on public.pb_grupos, public.pb_grupo_miembros, public.pb_grupo_lecturas from anon;

-- ========== MENSAJES: directos o de grupo ==========
alter table public.pb_mensajes add column if not exists grupo_id uuid references public.pb_grupos(id) on delete cascade;
alter table public.pb_mensajes alter column para drop not null;
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid = 'public.pb_mensajes'::regclass and contype = 'c'
           and (pg_get_constraintdef(oid) like '%de <> para%' or conname = 'pb_mensajes_destino') loop
    execute format('alter table public.pb_mensajes drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.pb_mensajes add constraint pb_mensajes_destino
  check ((para is not null and grupo_id is null and de <> para) or (para is null and grupo_id is not null));
create index if not exists pb_mensajes_grupo_idx on public.pb_mensajes(grupo_id, creado desc);

drop policy if exists "pb_mensajes lectura participantes" on public.pb_mensajes;
create policy "pb_mensajes lectura participantes" on public.pb_mensajes for select to authenticated
  using ((select public.pb_rol()) is not null and (de = (select auth.uid()) or para = (select auth.uid())
         or (grupo_id is not null and (select public.pb_es_miembro(grupo_id)))));
drop policy if exists "pb_mensajes envio" on public.pb_mensajes;
create policy "pb_mensajes envio" on public.pb_mensajes for insert to authenticated
  with check (
    (select public.pb_rol()) is not null and de = (select auth.uid())
    and ((grupo_id is null and para is not null and (select public.pb_puede_recibir(para)))
         or (grupo_id is not null and para is null and (select public.pb_es_miembro(grupo_id))))
    and (adjunto is null or (adjunto ->> 'path') like (select auth.uid())::text || '/%'));

create or replace function public.pb_msg_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and (new.id, new.de, new.para, new.grupo_id, new.cuerpo, new.adjunto, new.creado)
     is distinct from (old.id, old.de, old.para, old.grupo_id, old.cuerpo, old.adjunto, old.creado) then
    raise exception 'solo se puede marcar entregado o leido';
  end if;
  return new;
end $$;

-- adjuntos: tambien los miembros del grupo pueden leerlos
drop policy if exists "pb adjuntos leer" on storage.objects;
create policy "pb adjuntos leer" on storage.objects for select to authenticated
  using (bucket_id = 'pb-adjuntos' and (select public.pb_rol()) is not null
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or exists (select 1 from public.pb_mensajes m where m.adjunto ->> 'path' = name
                         and (m.para = (select auth.uid()) or (m.grupo_id is not null and (select public.pb_es_miembro(m.grupo_id)))))));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pb_grupo_miembros') then
    alter publication supabase_realtime add table public.pb_grupo_miembros;
  end if;
end $$;

-- ========== NOTIFICACIONES PUSH ==========
create table if not exists public.pb_config (key text primary key, value text not null);
alter table public.pb_config enable row level security;      -- sin politicas: solo la funcion Edge (service_role) y el servidor
revoke all on public.pb_config from anon, authenticated;
insert into public.pb_config(key, value) values ('webhook_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create table if not exists public.pb_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  preview boolean not null default true,
  muted text[] not null default '{}',
  dnd boolean not null default false,
  dnd_from text not null default '22:00',
  dnd_to text not null default '07:00',
  tz_offset int not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists pb_push_user_idx on public.pb_push(user_id);
alter table public.pb_push enable row level security;
drop policy if exists "pb_push propias" on public.pb_push;
create policy "pb_push propias" on public.pb_push for all to authenticated
  using (user_id = (select auth.uid()) and (select public.pb_rol()) is not null)
  with check (user_id = (select auth.uid()) and (select public.pb_rol()) is not null);
grant select, update, delete on public.pb_push to authenticated;
revoke all on public.pb_push from anon;

-- Registrar el dispositivo: el dispositivo pertenece a quien inicio sesion ultimo
create or replace function public.pb_push_registrar(p_endpoint text, p_p256dh text, p_auth text, p_ua text,
  p_preview boolean default true, p_muted text[] default '{}', p_dnd boolean default false,
  p_dnd_from text default '22:00', p_dnd_to text default '07:00', p_tz int default 0) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.pb_rol() is null then raise exception 'sin permiso'; end if;
  insert into public.pb_push(user_id, endpoint, p256dh, auth, ua, preview, muted, dnd, dnd_from, dnd_to, tz_offset)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_ua, 200), p_preview, coalesce(p_muted, '{}'), p_dnd, p_dnd_from, p_dnd_to, p_tz)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua,
    preview = excluded.preview, muted = excluded.muted, dnd = excluded.dnd, dnd_from = excluded.dnd_from, dnd_to = excluded.dnd_to,
    tz_offset = excluded.tz_offset, actualizado = now();
end $$;
revoke all on function public.pb_push_registrar(text, text, text, text, boolean, text[], boolean, text, text, int) from public, anon;
grant execute on function public.pb_push_registrar(text, text, text, text, boolean, text[], boolean, text, text, int) to authenticated;

-- Disparador: cada mensaje nuevo avisa a la funcion Edge 'pb-push' (nunca bloquea el envio)
do $$ begin create extension if not exists pg_net with schema extensions; exception when others then null; end $$;
create or replace function public.pb_notificar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare sec text;
begin
  begin
    select value into sec from public.pb_config where key = 'webhook_secret';
    perform net.http_post(
      url := 'https://gwczlpofvxihdsvzggcg.supabase.co/functions/v1/pb-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-pb-secret', sec),
      body := jsonb_build_object('id', new.id, 'de', new.de, 'para', new.para, 'grupo_id', new.grupo_id,
                                 'cuerpo', left(new.cuerpo, 200), 'adjunto', new.adjunto is not null),
      timeout_milliseconds := 5000);
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists pb_notificar_t on public.pb_mensajes;
create trigger pb_notificar_t after insert on public.pb_mensajes for each row execute function public.pb_notificar();
