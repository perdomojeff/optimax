do $t$
declare
  res text := '';
  sai1 uuid := gen_random_uuid(); sai2 uuid := gen_random_uuid(); mgr uuid := gen_random_uuid(); adm uuid := gen_random_uuid(); ana uuid := gen_random_uuid(); lec uuid := gen_random_uuid();
  n int; tot_wells int; tot_campo int; tot_res int;
  procedure_dummy int;
begin
  insert into auth.users(id,email,aud,role,raw_user_meta_data) values
    (sai1,'t_sai1@test.local','authenticated','authenticated','{}'),(sai2,'t_sai2@test.local','authenticated','authenticated','{}'),
    (mgr,'t_mgr@test.local','authenticated','authenticated','{}'),(adm,'t_adm@test.local','authenticated','authenticated','{}'),
    (ana,'t_ana@test.local','authenticated','authenticated','{}'),(lec,'t_lec@test.local','authenticated','authenticated','{}');
  update public.profiles set activo=true, role='sai' where user_id in (sai1,sai2);
  update public.profiles set activo=true, role='gerente' where user_id=mgr;
  update public.profiles set activo=true, role='admin' where user_id=adm;
  update public.profiles set activo=true, role='analista' where user_id=ana;
  update public.profiles set activo=true, role='lector' where user_id=lec;
  insert into public.app_docs(collection,doc_id,data) values
    ('wells','w_test','{"name":"X"}'),
    ('pm_horas','h_sai2','{"owner":"'||sai2||'","horas":4,"date":"2026-10-12","week":"2026-10-12"}'::jsonb),
    ('pm_horas','h_sai1','{"owner":"'||sai1||'","horas":2,"date":"2026-10-12","week":"2026-10-12"}'::jsonb);
  select count(*) into tot_wells from public.app_docs where collection='wells';
  select count(*) into tot_campo from public.dim_campo; select count(*) into tot_res from public.fact_reservas;
  res := res || format('[base] wells=%s dim_campo=%s fact_reservas=%s%s', tot_wells, tot_campo, tot_res, E'\n');

  -- ===== SAI1 =====
  perform set_config('request.jwt.claims', json_build_object('sub',sai1,'role','authenticated')::text, true); set local role authenticated;
  begin insert into public.app_docs(collection,doc_id,data) values ('pm_horas','n1',jsonb_build_object('owner',sai1,'horas',3.5)); res := res||'sai insert propio valido: OK (esperado OK)'||E'\n'; exception when others then res := res||'sai insert propio valido: FALLO '||sqlerrm||E'\n'; end;
  begin insert into public.app_docs(collection,doc_id,data) values ('pm_horas','n2',jsonb_build_object('owner',sai2,'horas',3)); res := res||'sai insert a nombre de otro: PERMITIDO (MAL)'||E'\n'; exception when others then res := res||'sai insert a nombre de otro: bloqueado (esperado)'||E'\n'; end;
  begin insert into public.app_docs(collection,doc_id,data) values ('pm_horas','n3',jsonb_build_object('owner',sai1,'horas',30)); res := res||'sai insert 30h: PERMITIDO (MAL)'||E'\n'; exception when others then res := res||'sai insert 30h: bloqueado (esperado)'||E'\n'; end;
  begin insert into public.app_docs(collection,doc_id,data) values ('pm_horas','n4',jsonb_build_object('owner',sai1,'horas','abc')); res := res||'sai insert horas texto: PERMITIDO (MAL)'||E'\n'; exception when others then res := res||'sai insert horas texto: bloqueado (esperado)'||E'\n'; end;
  begin insert into public.app_docs(collection,doc_id,data) values ('wells','n5','{"name":"hack"}'); res := res||'sai insert en wells: PERMITIDO (MAL)'||E'\n'; exception when others then res := res||'sai insert en wells: bloqueado (esperado)'||E'\n'; end;
  begin insert into public.app_docs(collection,doc_id,data) values ('timelog','n6',jsonb_build_object('owner',sai1)); res := res||'sai insert en timelog: PERMITIDO (MAL)'||E'\n'; exception when others then res := res||'sai insert en timelog: bloqueado (esperado)'||E'\n'; end;
  select count(*) into n from public.app_docs; res := res||format('sai ve en app_docs: %s filas (esperado 2: h_sai1 y n1)%s', n, E'\n');
  select count(*) into n from public.app_docs where collection='wells'; res := res||format('sai ve wells: %s (esperado 0)%s', n, E'\n');
  select count(*) into n from public.dim_campo; res := res||format('sai ve dim_campo: %s (esperado 0)%s', n, E'\n');
  select count(*) into n from public.fact_reservas; res := res||format('sai ve fact_reservas: %s (esperado 0)%s', n, E'\n');
  select count(*) into n from public.v_reservas_campo; res := res||format('sai ve v_reservas_campo: %s (esperado 0)%s', n, E'\n');
  select count(*) into n from storage.objects; res := res||format('sai ve storage.objects: %s (esperado 0)%s', n, E'\n');
  select count(*) into n from public.profiles; res := res||format('sai ve profiles: %s (esperado 1)%s', n, E'\n');
  update public.app_docs set data = data || '{"horas":1}' where doc_id='h_sai1'; get diagnostics n = row_count; res := res||format('sai update propio: %s filas (esperado 0)%s', n, E'\n');
  delete from public.app_docs where doc_id='h_sai1'; get diagnostics n = row_count; res := res||format('sai delete propio: %s filas (esperado 0)%s', n, E'\n');
  begin insert into public.app_docs(collection,doc_id,data) values ('pm_horas','h_sai1',jsonb_build_object('owner',sai1,'horas',9)) on conflict (collection,doc_id) do update set data=excluded.data; res := res||'sai upsert sobre propio: PERMITIDO (MAL)'||E'\n'; exception when others then res := res||'sai upsert sobre propio: bloqueado (esperado)'||E'\n'; end;
  begin update public.profiles set role='admin' where user_id=sai1; get diagnostics n = row_count; res := res||format('sai se sube a admin: %s filas%s', n, E'\n'); exception when others then res := res||'sai se sube a admin: bloqueado (esperado)'||E'\n'; end;
  reset role;

  -- ===== GERENTE / ADMIN =====
  perform set_config('request.jwt.claims', json_build_object('sub',mgr,'role','authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.app_docs where collection='pm_horas'; res := res||format('gerente ve pm_horas: %s (esperado 3)%s', n, E'\n');
  update public.app_docs set data = data || '{"horas":5}' where doc_id='h_sai2'; get diagnostics n = row_count; res := res||format('gerente edita: %s (esperado 1)%s', n, E'\n');
  delete from public.app_docs where doc_id='h_sai2'; get diagnostics n = row_count; res := res||format('gerente borra: %s (esperado 1)%s', n, E'\n');
  select count(*) into n from public.app_docs where collection='wells'; res := res||format('gerente ve wells: %s (esperado %s)%s', n, tot_wells, E'\n');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.app_docs where collection='pm_horas'; res := res||format('admin ve pm_horas: %s (esperado 2)%s', n, E'\n');
  update public.app_docs set data = data || '{"horas":6}' where doc_id='h_sai1'; get diagnostics n = row_count; res := res||format('admin edita: %s (esperado 1)%s', n, E'\n');
  delete from public.app_docs where doc_id='n1'; get diagnostics n = row_count; res := res||format('admin borra: %s (esperado 1)%s', n, E'\n');
  select count(*) into n from public.dim_campo; res := res||format('admin ve dim_campo: %s (esperado %s)%s', n, tot_campo, E'\n');
  reset role;

  -- ===== ANALISTA / LECTOR (no deben tocar pm_horas, pero todo lo demas igual que antes) =====
  perform set_config('request.jwt.claims', json_build_object('sub',ana,'role','authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.app_docs where collection='pm_horas'; res := res||format('analista ve pm_horas: %s (esperado 0)%s', n, E'\n');
  begin insert into public.app_docs(collection,doc_id,data) values ('pm_horas','a1',jsonb_build_object('owner',ana,'horas',2)); res := res||'analista inserta pm_horas: PERMITIDO (MAL)'||E'\n'; exception when others then res := res||'analista inserta pm_horas: bloqueado (esperado)'||E'\n'; end;
  update public.app_docs set data = data || '{"horas":1}' where doc_id='h_sai1'; get diagnostics n = row_count; res := res||format('analista edita pm_horas: %s (esperado 0)%s', n, E'\n');
  select count(*) into n from public.app_docs where collection='wells'; res := res||format('analista ve wells: %s (esperado %s)%s', n, tot_wells, E'\n');
  begin insert into public.app_docs(collection,doc_id,data) values ('wells','w2','{"name":"ok"}'); res := res||'analista inserta wells: OK (esperado, como antes)'||E'\n'; exception when others then res := res||'analista inserta wells: FALLO (regresion) '||sqlerrm||E'\n'; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub',lec,'role','authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.app_docs where collection='pm_horas'; res := res||format('lector ve pm_horas: %s (esperado 0)%s', n, E'\n');
  select count(*) into n from public.fact_reservas; res := res||format('lector ve fact_reservas: %s (esperado %s)%s', n, tot_res, E'\n');
  reset role;
  raise exception E'RESULTADOS\n%', res;
end $t$;
