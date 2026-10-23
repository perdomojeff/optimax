-- Documentos: módulo gemelo de Biblioteca (colecciones docs / docstext de app_docs; archivos en bucket "biblioteca", carpeta d/)
-- Lectura: todos los roles, incluido SAI (solo lectura). Escritura: igual que Biblioteca (subir admin/analista; eliminar admin).
begin;

-- 1) SAI: además de sus horas (pm_horas), puede LEER las colecciones docs y docstext
drop policy if exists "pm_horas lectura restringida" on public.app_docs;
create policy "pm_horas lectura restringida" on public.app_docs as restrictive for select to authenticated
using (
  case
    when (select (current_app_role())::text) = 'sai' then
      (collection = 'pm_horas' and (data ->> 'owner') = (select auth.uid())::text)
      or collection in ('docs', 'docstext')
    else (collection <> 'pm_horas') or (select (current_app_role())::text) in ('admin', 'gerente') or (data ->> 'owner') = (select auth.uid())::text
  end);

-- 2) Colecciones protegidas (igual que library / libtext): gerente no inserta nuevas; analista no borra
drop policy if exists "gerente inserta solo no protegidos o existentes" on public.app_docs;
create policy "gerente inserta solo no protegidos o existentes" on public.app_docs for insert to authenticated
with check (
  (select current_app_role()) = 'gerente'::app_role and collection <> 'timelog'
  and (collection <> all (array['fields','reservoirs','wells','categories','regions','library','libtext','docs','docstext']) or doc_existe(collection, doc_id)));

drop policy if exists "borrado: admin todo; analista solo no protegidos" on public.app_docs;
create policy "borrado: admin todo; analista solo no protegidos" on public.app_docs for delete to authenticated
using (
  (select current_app_role()) = 'admin'::app_role
  or ((select current_app_role()) = 'analista'::app_role
      and collection <> all (array['fields','reservoirs','categories','regions','timelog','library','libtext','docs','docstext'])));

-- 3) Storage: SAI puede leer SOLO la carpeta d/ del bucket biblioteca (y sus adjuntos de Páginas Blancas, como antes)
drop policy if exists "sai sin acceso" on storage.objects;
create policy "sai sin acceso" on storage.objects as restrictive for select to authenticated
using (
  coalesce((select (current_app_role())::text), '') <> 'sai'
  or bucket_id = 'pb-adjuntos'
  or (bucket_id = 'biblioteca' and name like 'd/%'));

commit;
