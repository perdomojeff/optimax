-- StrataFlow · Project Manager (SAI Group). Prerrequisito (ya aplicado): alter type public.app_role add value 'sai';
-- Modelo: coleccion app_docs 'pm_horas' (data: owner, date, week, project, activity, horas, note).
-- SAI: solo INSERT de sus propias horas y SELECT de las propias. Sin UPDATE, sin DELETE, sin acceso a ninguna otra tabla.
-- Admin y gerente: ver todo, editar y borrar. Resto de roles: no tocan pm_horas.

-- 1) SAI no lee ninguna tabla de datos ni el Storage (politicas restrictivas: se suman con AND a las permisivas existentes)
do $$ declare r record; begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname not in ('app_docs','profiles') loop
    execute format('drop policy if exists "sai sin acceso" on public.%I', r.relname);
    execute format('create policy "sai sin acceso" on public.%I as restrictive for select to authenticated using (coalesce((select public.current_app_role()::text),'''') <> ''sai'')', r.relname);
  end loop;
end $$;
drop policy if exists "sai sin acceso" on storage.objects;
create policy "sai sin acceso" on storage.objects as restrictive for select to authenticated
  using (coalesce((select public.current_app_role()::text),'') <> 'sai');

-- 2) app_docs: lectura
drop policy if exists "pm_horas lectura restringida" on public.app_docs;
create policy "pm_horas lectura restringida" on public.app_docs as restrictive for select to authenticated using (
  case when (select public.current_app_role()::text) = 'sai'
       then collection = 'pm_horas' and data->>'owner' = (select auth.uid())::text
       else collection <> 'pm_horas' or (select public.current_app_role()::text) in ('admin','gerente') or data->>'owner' = (select auth.uid())::text end);

-- 3) app_docs: SAI solo inserta horas propias y validas (0,25 a 24 h)
drop policy if exists "sai registra sus horas" on public.app_docs;
create policy "sai registra sus horas" on public.app_docs for insert to authenticated with check (
  (select public.current_app_role()::text) = 'sai' and collection = 'pm_horas'
  and data->>'owner' = (select auth.uid())::text
  and case when jsonb_typeof(data->'horas') = 'number' then (data->>'horas')::numeric between 0.25 and 24 else false end);
drop policy if exists "pm_horas insert restringido" on public.app_docs;
create policy "pm_horas insert restringido" on public.app_docs as restrictive for insert to authenticated with check (
  collection <> 'pm_horas' or (select public.current_app_role()::text) in ('admin','gerente')
  or ((select public.current_app_role()::text) = 'sai' and data->>'owner' = (select auth.uid())::text));

-- 4) app_docs: editar y borrar solo admin y gerente
drop policy if exists "pm_horas update restringido" on public.app_docs;
create policy "pm_horas update restringido" on public.app_docs as restrictive for update to authenticated
  using (collection <> 'pm_horas' or (select public.current_app_role()::text) in ('admin','gerente'))
  with check (collection <> 'pm_horas' or (select public.current_app_role()::text) in ('admin','gerente'));
drop policy if exists "gerente borra horas pm" on public.app_docs;
create policy "gerente borra horas pm" on public.app_docs for delete to authenticated
  using (collection = 'pm_horas' and (select public.current_app_role()::text) = 'gerente');
drop policy if exists "pm_horas delete restringido" on public.app_docs;
create policy "pm_horas delete restringido" on public.app_docs as restrictive for delete to authenticated
  using (collection <> 'pm_horas' or (select public.current_app_role()::text) in ('admin','gerente'));
