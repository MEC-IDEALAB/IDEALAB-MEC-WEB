SET LOCAL plpgsql.check_asserts=on;
DO $catalog$
DECLARE t text; r text; f text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.projects','public.project_members','idealab_private.project_controls_v1','idealab_private.project_join_requests_v1',
    'idealab_private.project_commands_v1','idealab_private.project_join_attempts_v1','idealab_private.project_events_v1'] LOOP
    ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid=t::regclass),'forced RLS';
    FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      ASSERT NOT has_table_privilege(r,t,'SELECT,INSERT,UPDATE,DELETE') AND NOT has_any_column_privilege(r,t,'SELECT,INSERT,UPDATE'),'no raw API grants';
    END LOOP;
  END LOOP;
  FOREACH f IN ARRAY ARRAY['idealab_private.get_projects_v1(text,text,timestamptz,uuid)','idealab_private.get_project_v1(uuid)',
    'idealab_private.get_own_project_requests_v1()','idealab_private.mutate_project_v1(jsonb,uuid)',
    'public.get_projects_v1(text,text,timestamptz,uuid)','public.get_project_v1(uuid)','public.get_own_project_requests_v1()','public.mutate_project_v1(jsonb,uuid)'] LOOP
    ASSERT NOT has_function_privilege('anon',f,'EXECUTE'),'anon RPC denied';
    ASSERT NOT has_function_privilege('service_role',f,'EXECUTE'),'service RPC denied';
    ASSERT has_function_privilege('authenticated',f,'EXECUTE'),'member RPC guarded inside';
    ASSERT (SELECT proconfig=ARRAY['search_path=""']::text[] FROM pg_proc WHERE oid=f::regprocedure),'empty search path';
  END LOOP;
  FOREACH f IN ARRAY ARRAY['idealab_private.project_applicant_ready_v1(uuid)','idealab_private.project_card_v1(uuid)'] LOOP
    ASSERT NOT has_function_privilege('authenticated',f,'EXECUTE') AND NOT has_function_privilege('anon',f,'EXECUTE') AND NOT has_function_privilege('service_role',f,'EXECUTE'),'internal helper not API callable';
  END LOOP;
  FOREACH f IN ARRAY ARRAY['public.get_projects_v1(text,text,timestamptz,uuid)','public.get_project_v1(uuid)','public.get_own_project_requests_v1()','public.mutate_project_v1(jsonb,uuid)'] LOOP
    ASSERT (SELECT NOT prosecdef FROM pg_proc WHERE oid=f::regprocedure),'public wrappers are invoker';
  END LOOP;
END;
$catalog$;
SET LOCAL ROLE authenticated;
DO $sessionless$
DECLARE denied boolean:=false;
BEGIN
  BEGIN PERFORM public.get_projects_v1('discover','',NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'no identity list denied'; denied:=false;
  BEGIN PERFORM public.get_project_v1(gen_random_uuid()); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'no identity detail denied'; denied:=false;
  BEGIN PERFORM public.get_own_project_requests_v1(); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'no identity requests denied';
  ASSERT public.mutate_project_v1('{"kind":"create","title":"No identity","description":"test","visibility":"public"}'::jsonb,gen_random_uuid())='{"status":"denied"}'::jsonb,'no identity mutation denied';
END;
$sessionless$;
RESET ROLE;
SELECT '70 project catalog/sessionless-role assertions passed' AS result;
