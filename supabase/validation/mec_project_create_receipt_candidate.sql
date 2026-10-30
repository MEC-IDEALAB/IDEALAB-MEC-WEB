-- Isolated validation candidate only. Verify the target project independently.
DO $preflight$ BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres'
    OR to_regclass('idealab_private.project_commands_v1') IS NULL
    OR to_regclass('public.projects') IS NULL
    OR to_regprocedure('idealab_private.lab_opening_member_ready_v1()') IS NULL
    OR to_regprocedure('idealab_private.get_own_project_create_receipt_v1(uuid)') IS NOT NULL
    OR to_regprocedure('public.get_own_project_create_receipt_v1(uuid)') IS NOT NULL
    OR NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_catalog.pg_class WHERE oid='idealab_private.project_commands_v1'::regclass)
    OR has_table_privilege('authenticated','idealab_private.project_commands_v1','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege('anon','idealab_private.project_commands_v1','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege('service_role','idealab_private.project_commands_v1','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  THEN RAISE EXCEPTION 'unexpected isolated project receipt baseline'; END IF;
END; $preflight$;

CREATE FUNCTION idealab_private.get_own_project_create_receipt_v1(p_command_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $receipt$
DECLARE v_project uuid;
BEGIN
  IF p_command_id IS NULL OR NOT idealab_private.lab_opening_member_ready_v1() THEN RETURN NULL; END IF;
  SELECT p.id INTO v_project
  FROM idealab_private.project_commands_v1 AS c
  JOIN public.projects AS p ON p.id = CASE
    WHEN c.result->>'project_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (c.result->>'project_id')::uuid ELSE NULL END AND p.created_by=auth.uid()
  WHERE c.user_id=auth.uid() AND c.command_id=p_command_id
    AND c.request->>'kind'='create' AND c.result->>'status'='saved';
  IF v_project IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('status','saved','project_id',v_project);
END; $receipt$;

CREATE FUNCTION public.get_own_project_create_receipt_v1(p_command_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $wrapper$
  SELECT idealab_private.get_own_project_create_receipt_v1(p_command_id)
$wrapper$;
REVOKE ALL ON FUNCTION idealab_private.get_own_project_create_receipt_v1(uuid),
  public.get_own_project_create_receipt_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_own_project_create_receipt_v1(uuid),
  public.get_own_project_create_receipt_v1(uuid) TO authenticated;
