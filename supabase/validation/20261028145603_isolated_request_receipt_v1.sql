-- Validation candidate. Apply only after transaction-scoped ACL and behavior tests.
DO $preflight$ BEGIN
  IF current_user <> 'postgres'
    OR to_regclass('idealab_private.work_request_commands_v1') IS NULL
    OR to_regclass('idealab_private.work_requests_v1') IS NULL
    OR to_regprocedure('idealab_private.current_student_mec_admitted_v1()') IS NULL
    OR to_regprocedure('idealab_private.get_own_submit_receipt_v1(uuid)') IS NOT NULL
    OR to_regprocedure('public.get_own_submit_receipt_v1(uuid)') IS NOT NULL
  THEN RAISE EXCEPTION 'unexpected isolated receipt baseline'; END IF;
END; $preflight$;

CREATE FUNCTION idealab_private.get_own_submit_receipt_v1(p_command_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $receipt$
DECLARE v_request_id uuid;
BEGIN
  IF p_command_id IS NULL OR NOT idealab_private.current_student_mec_admitted_v1() THEN
    RETURN NULL;
  END IF;
  SELECT r.id INTO v_request_id
  FROM idealab_private.work_request_commands_v1 AS c
  JOIN idealab_private.work_requests_v1 AS r
    ON r.id = CASE WHEN c.result->>'request_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (c.result->>'request_id')::uuid ELSE NULL END
    AND r.owner_id = auth.uid()
  WHERE c.owner_id = auth.uid() AND c.command_id = p_command_id
    AND c.payload->>'action' = 'submit' AND c.result->>'status' = 'submitted';
  IF v_request_id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('status', 'submitted', 'request_id', v_request_id);
END; $receipt$;

CREATE FUNCTION public.get_own_submit_receipt_v1(p_command_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT idealab_private.get_own_submit_receipt_v1(p_command_id);
$$;
REVOKE ALL ON FUNCTION idealab_private.get_own_submit_receipt_v1(uuid), public.get_own_submit_receipt_v1(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_own_submit_receipt_v1(uuid), public.get_own_submit_receipt_v1(uuid) TO authenticated;
