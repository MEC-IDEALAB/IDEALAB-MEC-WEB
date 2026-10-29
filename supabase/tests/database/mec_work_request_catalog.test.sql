-- Run inside the SAME explicit outer transaction as candidate installation.
-- This file intentionally has no BEGIN/COMMIT; standalone autocommit is invalid.
-- Passed with isolated_work_request_intake_v1 installation on 23 October 2026.
SET LOCAL plpgsql.check_asserts=on;
DO $catalog$
DECLARE t text; role_name text; f text;
BEGIN
  FOREACH t IN ARRAY ARRAY['idealab_private.work_requests_v1','idealab_private.work_request_commands_v1','idealab_private.work_request_events_v1','idealab_private.work_request_archive_v1'] LOOP
    ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid=t::regclass),'forced RLS';
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      ASSERT NOT has_table_privilege(role_name,t,'SELECT,INSERT,UPDATE,DELETE') AND NOT has_any_column_privilege(role_name,t,'SELECT,INSERT,UPDATE'),'no raw API grants';
    END LOOP;
  END LOOP;
  FOREACH f IN ARRAY ARRAY['idealab_private.get_own_work_requests_v1(timestamptz,uuid)','idealab_private.get_own_work_request_v1(uuid)','idealab_private.submit_work_request_v1(jsonb,uuid)','idealab_private.cancel_work_request_v1(uuid,text,uuid)',
    'public.get_own_work_requests_v1(timestamptz,uuid)','public.get_own_work_request_v1(uuid)','public.submit_work_request_v1(jsonb,uuid)','public.cancel_work_request_v1(uuid,text,uuid)'] LOOP
    ASSERT NOT has_function_privilege('anon',f,'EXECUTE'),'anon denied';
    ASSERT NOT has_function_privilege('service_role',f,'EXECUTE'),'service denied';
    ASSERT has_function_privilege('authenticated',f,'EXECUTE'),'authenticated guarded';
    ASSERT (SELECT proconfig=ARRAY['search_path=""']::text[] FROM pg_proc WHERE oid=f::regprocedure),'empty search path';
  END LOOP;
  FOREACH f IN ARRAY ARRAY['idealab_private.archive_work_requests_v1(uuid)','idealab_private.archive_deleted_user_work_requests_v1()','idealab_private.valid_work_reference_v1(text)','idealab_private.valid_work_intake_v1(jsonb)','idealab_private.work_request_card_v1(uuid)'] LOOP
    ASSERT NOT has_function_privilege('authenticated',f,'EXECUTE') AND NOT has_function_privilege('anon',f,'EXECUTE') AND NOT has_function_privilege('service_role',f,'EXECUTE'),'internal helpers not API';
  END LOOP;
  FOREACH f IN ARRAY ARRAY['public.get_own_work_requests_v1(timestamptz,uuid)','public.get_own_work_request_v1(uuid)','public.submit_work_request_v1(jsonb,uuid)','public.cancel_work_request_v1(uuid,text,uuid)'] LOOP
    ASSERT (SELECT NOT prosecdef FROM pg_proc WHERE oid=f::regprocedure),'invoker wrapper';
  END LOOP;
  ASSERT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.users'::regclass AND tgname='archive_deleted_user_work_requests_v1'
    AND tgfoid='idealab_private.archive_deleted_user_work_requests_v1()'::regprocedure AND tgtype=11 AND tgenabled='O'),'fixed before-delete row trigger';
  ASSERT (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid='idealab_private.work_request_archive_v1'::regclass AND attnum>0 AND NOT attisdropped)=ARRAY['archive_id','kind','service_id','status','history'],'archive contains only de-identified fields';
  ASSERT (SELECT count(*)=5 AND bool_and(confdeltype='c') FROM pg_constraint WHERE conrelid IN ('idealab_private.work_requests_v1'::regclass,'idealab_private.work_request_commands_v1'::regclass,'idealab_private.work_request_events_v1'::regclass) AND contype='f'),'new domain does not block owner deletion';
  ASSERT NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid IN ('idealab_private.archive_work_requests_v1(uuid)'::regprocedure,'idealab_private.archive_deleted_user_work_requests_v1()'::regprocedure)
    AND (NOT prosecdef OR proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[] OR pg_get_userbyid(proowner)<>'postgres')),'archive routines fixed owner and search path';
END; $catalog$;
SET LOCAL ROLE authenticated;
DO $sessionless$ DECLARE denied boolean:=false;
BEGIN
  BEGIN PERFORM public.get_own_work_requests_v1(NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'identity required for list';denied:=false;
  BEGIN PERFORM public.get_own_work_request_v1(gen_random_uuid()); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'identity required for detail';
  ASSERT public.submit_work_request_v1('{}',gen_random_uuid())='{"status":"denied"}'::jsonb,'identity required for submit';
  ASSERT public.cancel_work_request_v1(gen_random_uuid(),'1',gen_random_uuid())='{"status":"denied"}'::jsonb,'identity required for cancel';
END; $sessionless$;
RESET ROLE;
SELECT '65 work-request catalog/sessionless assertions passed' AS result;
