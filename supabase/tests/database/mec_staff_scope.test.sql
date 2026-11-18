-- Disposable fixture checks. No live identities are used.
SET LOCAL plpgsql.check_asserts = on;
INSERT INTO idealab_private.staff_scopes_v1 (id, kind, resource_key)
VALUES ('10000000-0000-0000-0000-000000000001', 'events', 'fixture-events'),
       ('10000000-0000-0000-0000-000000000002', 'machine', 'fixture-machine'),
       ('10000000-0000-0000-0000-000000000003', 'web', 'fixture-web');
INSERT INTO idealab_private.student_ambassadors_v1(user_id)
VALUES ('00000000-0000-0000-0000-000000000005');

-- Represents protected business writes callable only in this fixture.
CREATE TABLE idealab_private.fixture_actions (scope_id uuid, actor_id uuid);
REVOKE ALL ON idealab_private.fixture_actions FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE idealab_private.fixture_requests (
  id uuid PRIMARY KEY,
  scope_id uuid NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'approved'))
);
INSERT INTO idealab_private.fixture_requests(id, scope_id)
VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
REVOKE ALL ON idealab_private.fixture_requests FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.fixture_staff_action(p_scope uuid, p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM idealab_private.require_staff_scope_head_v1(p_scope, p_kind);
  INSERT INTO idealab_private.fixture_actions VALUES (p_scope, auth.uid());
END;
$$;
CREATE FUNCTION public.fixture_approve_machine_request_v1(
  p_request uuid, p_revision bigint, p_expected_actor uuid
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); request_scope uuid; request_row idealab_private.fixture_requests%ROWTYPE;
BEGIN
  IF actor IS NULL OR actor IS DISTINCT FROM p_expected_actor THEN
    RAISE EXCEPTION 'Fixture approval access denied' USING ERRCODE = '42501';
  END IF;
  SELECT scope_id INTO request_scope FROM idealab_private.fixture_requests WHERE id = p_request;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fixture request unavailable' USING ERRCODE = '42501'; END IF;
  PERFORM idealab_private.require_staff_scope_head_v1(request_scope, 'machine');
  SELECT * INTO request_row FROM idealab_private.fixture_requests WHERE id = p_request FOR UPDATE;
  IF request_row.revision IS DISTINCT FROM p_revision OR request_row.state <> 'pending' THEN
    RAISE EXCEPTION 'Fixture request revision conflict' USING ERRCODE = '40001';
  END IF;
  UPDATE idealab_private.fixture_requests SET revision = revision + 1, state = 'approved' WHERE id = p_request;
  INSERT INTO idealab_private.fixture_actions VALUES (request_scope, actor);
  RETURN request_row.revision + 1;
END;
$$;
REVOKE ALL ON FUNCTION public.fixture_staff_action(uuid,text),
  public.fixture_approve_machine_request_v1(uuid,bigint,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fixture_staff_action(uuid,text),
  public.fixture_approve_machine_request_v1(uuid,bigint,uuid) TO authenticated;

DO $acl$
DECLARE routine text; table_name text; api_role text;
BEGIN
  FOREACH routine IN ARRAY ARRAY[
    'public.set_staff_scope_head_v1(uuid,bigint,uuid,text,text,uuid,uuid)',
    'idealab_private.set_staff_scope_head_v1(uuid,bigint,uuid,text,text,uuid,uuid)'
  ] LOOP
    ASSERT NOT has_function_privilege('anon', routine, 'EXECUTE'), 'anonymous assignment denied';
    ASSERT NOT has_function_privilege('service_role', routine, 'EXECUTE'), 'service assignment denied';
    ASSERT has_function_privilege('authenticated', routine, 'EXECUTE'), 'guarded member entry';
    ASSERT (SELECT proconfig = ARRAY['search_path=""'] FROM pg_proc WHERE oid = routine::regprocedure), 'empty search path';
  END LOOP;
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.set_staff_scope_head_v1(uuid,bigint,uuid,text,text,uuid,uuid)'::regprocedure), 'invoker public wrapper';
  FOREACH table_name IN ARRAY ARRAY[
    'staff_scopes_v1', 'staff_scope_assignments_v1', 'staff_scope_history_v1', 'staff_scope_commands_v1'
  ] LOOP
    ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = ('idealab_private.' || table_name)::regclass), 'forced RLS';
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      ASSERT NOT has_table_privilege(api_role, 'idealab_private.' || table_name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), 'raw API access denied';
    END LOOP;
  END LOOP;
  ASSERT NOT has_function_privilege('authenticated', 'idealab_private.require_staff_scope_head_v1(uuid,text)', 'EXECUTE'), 'guard remains internal';
  ASSERT NOT has_function_privilege('authenticated', 'idealab_private.guard_staff_scope_assignment_limit_v1()', 'EXECUTE'), 'capacity trigger remains internal';
END;
$acl$;

SET LOCAL ROLE authenticated;
DO $behavior$
DECLARE
  event_scope uuid := '10000000-0000-0000-0000-000000000001';
  machine_scope uuid := '10000000-0000-0000-0000-000000000002';
  web_scope uuid := '10000000-0000-0000-0000-000000000003';
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  first_head uuid := '00000000-0000-0000-0000-000000000002';
  second_head uuid := '00000000-0000-0000-0000-000000000003';
  inactive_head uuid := '00000000-0000-0000-0000-000000000004';
  ambassador uuid := '00000000-0000-0000-0000-000000000005';
  third_head uuid := '00000000-0000-0000-0000-000000000006';
  event_command uuid := gen_random_uuid();
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 1, first_head, 'assign', 'Assign', gen_random_uuid(), admin_id);
    RAISE EXCEPTION 'Sessionless assignment accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM set_config('request.jwt.claim.sub', first_head::text, true);
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 1, first_head, 'assign', 'Assign', gen_random_uuid(), first_head);
    RAISE EXCEPTION 'Ordinary member assigned a head';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 1, first_head, 'assign', 'Assign', gen_random_uuid(), first_head);
    RAISE EXCEPTION 'Expected-account mismatch accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  ASSERT public.set_staff_scope_head_v1(event_scope, 1, first_head, 'assign', 'Assign', event_command, admin_id) = 2;
  PERFORM set_config('idealab_fixture.assignment_command', event_command::text, true);
  ASSERT public.set_staff_scope_head_v1(event_scope, 1, first_head, 'assign', 'Assign', event_command, admin_id) = 2, 'retry returns receipt';
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 2, second_head, 'assign', 'Second Event Head', gen_random_uuid(), admin_id);
    RAISE EXCEPTION 'Non-machine scope accepted a second active head';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 1, second_head, 'assign', 'Changed payload', event_command, admin_id);
    RAISE EXCEPTION 'Changed command payload accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 1, second_head, 'assign', 'stale', gen_random_uuid(), admin_id);
    RAISE EXCEPTION 'Stale revision accepted';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 2, inactive_head, 'assign', 'inactive', gen_random_uuid(), admin_id);
    RAISE EXCEPTION 'Inactive head accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  -- Super Admin assigns two distinct Machine Heads to one machine.
  ASSERT public.set_staff_scope_head_v1(machine_scope, 1, first_head, 'assign', 'Machine assignment A', gen_random_uuid(), admin_id) = 2;
  ASSERT public.set_staff_scope_head_v1(machine_scope, 2, second_head, 'assign', 'Machine assignment B', gen_random_uuid(), admin_id) = 3;
  BEGIN
    PERFORM public.set_staff_scope_head_v1(machine_scope, 3, third_head, 'assign', 'Over capacity', gen_random_uuid(), admin_id);
    RAISE EXCEPTION 'Third distinct Machine Head accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  PERFORM set_config('request.jwt.claim.sub', first_head::text, true);
  PERFORM public.fixture_staff_action(event_scope, 'events');
  PERFORM public.fixture_staff_action(machine_scope, 'machine');
  BEGIN
    PERFORM public.fixture_staff_action(machine_scope, 'events');
    RAISE EXCEPTION 'Wrong scope kind accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.fixture_staff_action('10000000-0000-0000-0000-000099999999', 'events');
    RAISE EXCEPTION 'Unassigned scope accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', second_head::text, true);
  PERFORM public.fixture_staff_action(machine_scope, 'machine');
  BEGIN
    PERFORM public.fixture_staff_action(event_scope, 'events');
    RAISE EXCEPTION 'Out-of-scope Machine Head accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', third_head::text, true);
  BEGIN
    PERFORM public.fixture_staff_action(machine_scope, 'machine');
    RAISE EXCEPTION 'Unassigned Machine Head accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Student Ambassador has the same in-app assign/revoke authority.
  PERFORM set_config('request.jwt.claim.sub', ambassador::text, true);
  ASSERT public.set_staff_scope_head_v1(web_scope, 1, third_head, 'assign', 'Ambassador assignment', gen_random_uuid(), ambassador) = 2;
  ASSERT public.set_staff_scope_head_v1(web_scope, 2, third_head, 'revoke', 'Ambassador revocation', gen_random_uuid(), ambassador) = 3;

  -- A handover on a non-machine scope remains one-head-at-a-time.
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  ASSERT public.set_staff_scope_head_v1(event_scope, 2, first_head, 'revoke', 'Handover', gen_random_uuid(), admin_id) = 3;
  ASSERT public.set_staff_scope_head_v1(event_scope, 3, second_head, 'assign', 'Handover', gen_random_uuid(), admin_id) = 4;
  ASSERT public.set_staff_scope_head_v1(event_scope, 1, first_head, 'assign', 'Assign', event_command, admin_id) = 2,
    'old receipt does not restore prior authority';
  PERFORM set_config('request.jwt.claim.sub', first_head::text, true);
  BEGIN
    PERFORM public.fixture_staff_action(event_scope, 'events');
    RAISE EXCEPTION 'Former Event Head retained authority';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', second_head::text, true);
  PERFORM public.fixture_staff_action(event_scope, 'events');
END;
$behavior$;
RESET ROLE;

-- The limit is a database invariant too: direct owner maintenance writes pass
-- through the same scope-locking trigger used by the setter.
DO $capacity_guard$
BEGIN
  ASSERT (SELECT count(*) = 2 AND count(DISTINCT user_id) = 2
    FROM idealab_private.staff_scope_assignments_v1
    WHERE scope_id = '10000000-0000-0000-0000-000000000002' AND revoked_at IS NULL),
    'machine has exactly two distinct active heads';
  BEGIN
    INSERT INTO idealab_private.staff_scope_assignments_v1(scope_id, user_id, assigned_by, assignment_reason)
    VALUES ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006',
      '00000000-0000-0000-0000-000000000001', 'Direct capacity probe');
    RAISE EXCEPTION 'Database accepted a third active machine head';
  EXCEPTION WHEN check_violation THEN NULL; END;
END;
$capacity_guard$;

DO $account_guards$
DECLARE event_scope uuid := '10000000-0000-0000-0000-000000000001';
  machine_scope uuid := '10000000-0000-0000-0000-000000000002';
  head uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
  UPDATE auth.users SET banned_until = 'infinity' WHERE id = head;
  PERFORM set_config('request.jwt.claim.sub', head::text, true);
  BEGIN
    PERFORM public.fixture_staff_action(machine_scope, 'machine');
    RAISE EXCEPTION 'Banned head accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE auth.users SET banned_until = NULL, email_confirmed_at = NULL WHERE id = head;
  BEGIN
    PERFORM public.fixture_staff_action(machine_scope, 'machine');
    RAISE EXCEPTION 'Unverified head accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE auth.users SET email_confirmed_at = now(), is_anonymous = true WHERE id = head;
  BEGIN
    PERFORM public.fixture_staff_action(machine_scope, 'machine');
    RAISE EXCEPTION 'Anonymous head accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE auth.users SET is_anonymous = false WHERE id = head;
  UPDATE public.users SET is_active = false WHERE id = head;
  BEGIN
    PERFORM public.fixture_staff_action(machine_scope, 'machine');
    RAISE EXCEPTION 'Inactive head accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.users SET is_active = true WHERE id = head;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  ASSERT public.set_staff_scope_head_v1(machine_scope, 3, head, 'revoke', 'Revoke machine role', gen_random_uuid(), auth.uid()) = 4;
  ASSERT public.set_staff_scope_head_v1(event_scope, 4, head, 'revoke', 'Revoke event role', gen_random_uuid(), auth.uid()) = 5;
  PERFORM set_config('request.jwt.claim.sub', head::text, true);
  BEGIN
    PERFORM public.fixture_staff_action(machine_scope, 'machine');
    RAISE EXCEPTION 'Revoked head accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  DELETE FROM public.users WHERE id = head;

  -- Saved receipts do not outlive the caller's current authority.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  UPDATE public.users SET role = 'student' WHERE id = auth.uid();
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 1,
      '00000000-0000-0000-0000-000000000002', 'assign', 'Assign',
      current_setting('idealab_fixture.assignment_command')::uuid, auth.uid());
    RAISE EXCEPTION 'Demoted administrator recovered receipt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.users SET role = 'super_admin' WHERE id = auth.uid();
  UPDATE auth.users SET banned_until = 'infinity' WHERE id = auth.uid();
  BEGIN
    PERFORM public.set_staff_scope_head_v1(event_scope, 1,
      '00000000-0000-0000-0000-000000000002', 'assign', 'Assign',
      current_setting('idealab_fixture.assignment_command')::uuid, auth.uid());
    RAISE EXCEPTION 'Banned administrator recovered receipt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE auth.users SET banned_until = NULL WHERE id = auth.uid();

  ASSERT (SELECT count(*) = 4 FROM idealab_private.staff_scope_history_v1 WHERE scope_id = event_scope), 'event audit history retained';
  ASSERT (SELECT count(*) = 3 FROM idealab_private.staff_scope_history_v1 WHERE scope_id = machine_scope), 'machine assignment and revocation history retained';
  ASSERT (SELECT count(*) = 2 FROM idealab_private.staff_scope_history_v1 WHERE scope_id = '10000000-0000-0000-0000-000000000003'), 'ambassador actions retained';
  ASSERT (SELECT count(*) = 0 FROM idealab_private.staff_scope_assignments_v1 WHERE scope_id IN (event_scope, machine_scope) AND revoked_at IS NULL AND user_id = head), 'revoked target has no current authority';
  ASSERT (SELECT revision = 5 FROM idealab_private.staff_scopes_v1 WHERE id = event_scope), 'event scope revisions are serialized';
  ASSERT (SELECT revision = 4 FROM idealab_private.staff_scopes_v1 WHERE id = machine_scope), 'machine scope revisions are serialized';
  ASSERT (SELECT revision = 3 FROM idealab_private.staff_scopes_v1 WHERE id = '10000000-0000-0000-0000-000000000003'), 'ambassador assignment revisions are serialized';
  ASSERT (SELECT count(*) = 4 FROM idealab_private.fixture_actions), 'denied calls left no effects';
  ASSERT (SELECT state = 'pending' AND revision = 1 FROM idealab_private.fixture_requests), 'concurrency approval fixture starts unmodified';
END;
$account_guards$;
