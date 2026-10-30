-- Isolated validation only; run under a savepoint that is rolled back.
SET LOCAL plpgsql.check_asserts=on;
DO $setup$
DECLARE actor uuid; other uuid; project uuid:=gen_random_uuid(); other_project uuid:=gen_random_uuid();
  command uuid:=gen_random_uuid(); other_command uuid:=gen_random_uuid(); update_command uuid:=gen_random_uuid(); malformed uuid:=gen_random_uuid();
BEGIN
  SELECT user_id INTO STRICT actor FROM idealab_private.lab_opening_permissions_v1 WHERE is_active;
  SELECT user_id INTO STRICT other FROM idealab_private.mec_registration_collision_state_v1;
  ASSERT actor<>other,'distinct identities';
  INSERT INTO public.projects(id,title,created_by) VALUES
    (project,'ROLLBACK project receipt',actor),(other_project,'ROLLBACK other receipt',other);
  INSERT INTO idealab_private.project_commands_v1(user_id,command_id,request,result) VALUES
    (actor,command,'{"kind":"create","title":"private fixture"}',jsonb_build_object('status','saved','project_id',project,'revision','1')),
    (other,other_command,'{"kind":"create"}',jsonb_build_object('status','saved','project_id',other_project,'revision','1')),
    (actor,update_command,'{"kind":"update"}',jsonb_build_object('status','saved','project_id',project,'revision','2')),
    (actor,malformed,'{"kind":"create"}','{"status":"saved","project_id":"invalid"}');
  PERFORM set_config('idealab_test.actor',actor::text,true);
  PERFORM set_config('idealab_test.other',other::text,true);
  PERFORM set_config('idealab_test.project',project::text,true);
  PERFORM set_config('idealab_test.command',command::text,true);
  PERFORM set_config('idealab_test.other_command',other_command::text,true);
  PERFORM set_config('idealab_test.update_command',update_command::text,true);
  PERFORM set_config('idealab_test.malformed',malformed::text,true);
END; $setup$;
DO $acl$ DECLARE r text; f text; BEGIN
  ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_catalog.pg_class WHERE oid='idealab_private.project_commands_v1'::regclass),'forced RLS';
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    ASSERT NOT has_table_privilege(r,'idealab_private.project_commands_v1','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'raw receipt privileges denied';
  END LOOP;
  FOREACH f IN ARRAY ARRAY['idealab_private.get_own_project_create_receipt_v1(uuid)','public.get_own_project_create_receipt_v1(uuid)'] LOOP
    ASSERT (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid=f::regprocedure),'fixed search path';
    ASSERT NOT has_function_privilege('anon',f,'EXECUTE') AND NOT has_function_privilege('service_role',f,'EXECUTE'),'non-member execute denied';
  END LOOP;
  ASSERT (SELECT prosecdef FROM pg_proc WHERE oid='idealab_private.get_own_project_create_receipt_v1(uuid)'::regprocedure),'private definer';
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.get_own_project_create_receipt_v1(uuid)'::regprocedure),'wrapper invoker';
  ASSERT NOT has_function_privilege('anon','public.get_own_project_create_receipt_v1(uuid)','EXECUTE'),'anonymous denied';
  ASSERT NOT has_function_privilege('service_role','public.get_own_project_create_receipt_v1(uuid)','EXECUTE'),'service denied';
  ASSERT has_function_privilege('authenticated','public.get_own_project_create_receipt_v1(uuid)','EXECUTE'),'authenticated granted';
  ASSERT NOT has_table_privilege('authenticated','idealab_private.project_commands_v1','SELECT'),'raw receipt denied';
END; $acl$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',current_setting('idealab_test.actor'),true); END $$;
DO $owner$ BEGIN
  ASSERT public.get_own_project_create_receipt_v1(current_setting('idealab_test.command')::uuid)
    = jsonb_build_object('status','saved','project_id',current_setting('idealab_test.project')::uuid),'exact owned projection';
  ASSERT public.get_own_project_create_receipt_v1(current_setting('idealab_test.other_command')::uuid) IS NULL,'other receipt hidden';
  ASSERT public.get_own_project_create_receipt_v1(current_setting('idealab_test.update_command')::uuid) IS NULL,'updates excluded';
  ASSERT public.get_own_project_create_receipt_v1(current_setting('idealab_test.malformed')::uuid) IS NULL,'malformed excluded';
  ASSERT public.get_own_project_create_receipt_v1(gen_random_uuid()) IS NULL,'missing unresolved';
  ASSERT public.get_own_project_create_receipt_v1(NULL) IS NULL,'null unresolved';
END; $owner$;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',current_setting('idealab_test.other'),true); END $$;
DO $other$ BEGIN
  ASSERT public.get_own_project_create_receipt_v1(current_setting('idealab_test.command')::uuid) IS NULL,'unadmitted denied';
END; $other$;
RESET ROLE;
