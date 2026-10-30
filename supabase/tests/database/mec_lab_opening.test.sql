SET LOCAL plpgsql.check_asserts = on;
DO $catalog$
DECLARE t text; r text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lab_opening_permissions_v1','lab_opening_state_v1','lab_opening_changes_v1'] LOOP
    ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = ('idealab_private.' || t)::regclass), 'forced RLS';
    FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      ASSERT NOT has_table_privilege(r,'idealab_private.' || t,'SELECT,INSERT,UPDATE,DELETE'), 'raw table denied';
    END LOOP;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['public.get_lab_opening_v1()','public.set_lab_opening_v1(text,text,uuid)',
    'idealab_private.get_lab_opening_v1()','idealab_private.set_lab_opening_v1(text,text,uuid)'] LOOP
    ASSERT NOT has_function_privilege('anon',t,'EXECUTE'), 'anonymous RPC denied';
    ASSERT NOT has_function_privilege('service_role',t,'EXECUTE'), 'service RPC denied';
    ASSERT has_function_privilege('authenticated',t,'EXECUTE'), 'member RPC callable with inner guards';
    ASSERT (SELECT proconfig = ARRAY['search_path=""']::text[] FROM pg_proc WHERE oid = t::regprocedure), 'empty search path';
  END LOOP;
END;
$catalog$;
SET LOCAL ROLE authenticated;
DO $negative$
DECLARE v jsonb; denied boolean := false;
BEGIN
  BEGIN PERFORM public.get_lab_opening_v1(); EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'sessionless authenticated caller cannot read status';
  SELECT public.set_lab_opening_v1('open','0',gen_random_uuid()) INTO v;
  ASSERT v = '{"status":"denied"}'::jsonb, 'sessionless authenticated caller cannot write status';
END;
$negative$;
RESET ROLE;
SELECT '30 lab opening catalog/negative-role assertions passed' AS result;
