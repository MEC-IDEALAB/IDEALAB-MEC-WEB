-- Catalog/negative-role suite. No fabricated Auth account or attendance rows.
SET LOCAL plpgsql.check_asserts = on;
DO $checks$
BEGIN
  ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.lab_sessions'::regclass), 'forced RLS';
  ASSERT NOT has_table_privilege('anon','public.lab_sessions','SELECT'), 'anon cannot read table';
  ASSERT NOT has_table_privilege('authenticated','public.lab_sessions','INSERT'), 'no client check-in';
  ASSERT NOT has_table_privilege('authenticated','public.lab_sessions','UPDATE'), 'no client checkout';
  ASSERT NOT has_table_privilege('authenticated','public.lab_sessions','DELETE'), 'no client deletion';
  ASSERT NOT has_function_privilege('anon','public.get_own_lab_visits_v1()','EXECUTE'), 'anon cannot call RPC';
  ASSERT has_function_privilege('authenticated','public.get_own_lab_visits_v1()','EXECUTE'), 'member can call RPC';
  ASSERT (SELECT NOT prosecdef AND provolatile='s' AND proconfig=ARRAY['search_path=""']::text[] FROM pg_proc WHERE oid='public.get_own_lab_visits_v1()'::regprocedure), 'invoker stable empty-path RPC';
  ASSERT NOT has_column_privilege('authenticated','public.lab_sessions','created_at','SELECT'), 'unused column not exposed';
  ASSERT NOT has_table_privilege('service_role','public.lab_sessions','SELECT,INSERT,UPDATE,DELETE'), 'service role has no table grant';
  ASSERT NOT has_function_privilege('service_role','public.get_own_lab_visits_v1()','EXECUTE'), 'service role has no API execution grant';
END;
$checks$;
SET LOCAL ROLE authenticated;
DO $caller$
BEGIN
  ASSERT (SELECT count(*) FROM public.get_own_lab_visits_v1())=0, 'no caller identity returns no rows';
END;
$caller$;
RESET ROLE;
SELECT '12 catalog/negative-role assertions passed' AS result;
