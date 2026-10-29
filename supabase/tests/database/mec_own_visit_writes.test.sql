SET LOCAL plpgsql.check_asserts = on;
DO $catalog$
DECLARE r text; f text;
BEGIN
  ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='idealab_private.own_visit_commands_v1'::regclass), 'forced private RLS';
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    ASSERT NOT has_table_privilege(r,'idealab_private.own_visit_commands_v1','SELECT,INSERT,UPDATE,DELETE'), 'raw commands denied';
    ASSERT NOT has_table_privilege(r,'public.lab_sessions','INSERT,UPDATE,DELETE')
      AND NOT has_any_column_privilege(r,'public.lab_sessions','INSERT,UPDATE'), 'raw attendance writers denied';
  END LOOP;
  ASSERT (SELECT indisunique AND indisvalid AND pg_get_expr(indpred,indrelid)='(checkout_time IS NULL)' FROM pg_index
    WHERE indexrelid='public.lab_sessions_one_active_owner_v1'::regclass), 'one active visit index';
  FOREACH f IN ARRAY ARRAY['public.check_in_lab_v1(text,uuid)','public.check_out_lab_v1(uuid,uuid)','idealab_private.change_own_visit_v1(text,text,uuid,uuid)'] LOOP
    ASSERT NOT has_function_privilege('anon',f,'EXECUTE'), 'anon endpoint denied';
    ASSERT NOT has_function_privilege('service_role',f,'EXECUTE'), 'service endpoint denied';
    ASSERT has_function_privilege('authenticated',f,'EXECUTE'), 'member endpoints guarded inside';
    ASSERT (SELECT proconfig=ARRAY['search_path=""']::text[] FROM pg_proc WHERE oid=f::regprocedure), 'empty function search path';
  END LOOP;
END;
$catalog$;
SET LOCAL ROLE authenticated;
DO $no_identity$
BEGIN
  ASSERT public.check_in_lab_v1('test',gen_random_uuid())='{"status":"denied"}'::jsonb, 'sessionless check-in denied';
  ASSERT public.check_out_lab_v1(gen_random_uuid(),gen_random_uuid())='{"status":"denied"}'::jsonb, 'sessionless checkout denied';
END;
$no_identity$;
RESET ROLE;
SELECT '22 own-visit catalog/sessionless-role assertions passed' AS result;
