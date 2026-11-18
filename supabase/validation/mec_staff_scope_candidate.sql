-- Local review candidate. Requires the shared profile schema and trusted role set.
-- Apply as one transaction. Provision reviewed scopes through database maintenance.
DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = current_user AND rolbypassrls)
    OR (SELECT nspowner FROM pg_catalog.pg_namespace WHERE nspname = 'idealab_private') IS DISTINCT FROM current_user::regrole
    OR NOT has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR to_regclass('public.users') IS NULL OR to_regclass('auth.users') IS NULL
    OR to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL THEN
    RAISE EXCEPTION 'Staff scope baseline needs review';
  END IF;
END;
$preflight$;

-- The ambassador designation lives outside the shared account role enum.
-- Provisioning is restricted to reviewed database maintenance.
CREATE TABLE idealab_private.student_ambassadors_v1 (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT
);
ALTER TABLE idealab_private.student_ambassadors_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.student_ambassadors_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON idealab_private.student_ambassadors_v1
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE idealab_private.staff_scopes_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('machine', 'room', 'operations', 'events', 'web', 'tech', 'patent_documentation', 'design')),
  resource_key text NOT NULL CHECK (length(resource_key) BETWEEN 1 AND 120 AND resource_key = btrim(resource_key)),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (kind, resource_key)
);

-- Each assignment is retained when revoked. User identifiers deliberately have
-- no FK so account deletion cannot erase or invalidate the historical record.
-- Authorization always rechecks the live shared-account rows before allowing work.
CREATE TABLE idealab_private.staff_scope_assignments_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES idealab_private.staff_scopes_v1(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  assignment_reason text NOT NULL CHECK (length(assignment_reason) BETWEEN 1 AND 500),
  revoked_by uuid,
  revoked_at timestamptz,
  revocation_reason text,
  CHECK ((revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
      OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL
        AND revocation_reason IS NOT NULL AND length(revocation_reason) BETWEEN 1 AND 500))
);
CREATE UNIQUE INDEX staff_scope_one_active_assignment_v1
  ON idealab_private.staff_scope_assignments_v1(scope_id, user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX staff_scope_active_user_v1
  ON idealab_private.staff_scope_assignments_v1(user_id, scope_id)
  WHERE revoked_at IS NULL;

-- Lock the parent scope before counting. The setter also holds this row lock;
-- the trigger protects the invariant if an authorized maintenance path inserts
-- directly. Machine scopes allow two distinct active heads; other scope kinds
-- retain the prior single-head behavior.
CREATE FUNCTION idealab_private.guard_staff_scope_assignment_limit_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE scope_kind text; active_heads integer; assignment_limit integer;
BEGIN
  IF NEW.revoked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.revoked_at IS NULL THEN
    IF NEW.scope_id IS DISTINCT FROM OLD.scope_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Active assignment identity is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  SELECT kind INTO scope_kind
  FROM idealab_private.staff_scopes_v1
  WHERE id = NEW.scope_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff assignment scope does not exist' USING ERRCODE = '23503';
  END IF;
  assignment_limit := CASE WHEN scope_kind = 'machine' THEN 2 ELSE 1 END;
  SELECT count(DISTINCT user_id)::integer INTO active_heads
  FROM idealab_private.staff_scope_assignments_v1
  WHERE scope_id = NEW.scope_id AND revoked_at IS NULL AND id <> NEW.id;
  IF active_heads >= assignment_limit THEN
    RAISE EXCEPTION 'Staff scope active-head limit reached' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER staff_scope_assignment_limit_v1
  BEFORE INSERT OR UPDATE OF scope_id, user_id, revoked_at
  ON idealab_private.staff_scope_assignments_v1
  FOR EACH ROW EXECUTE FUNCTION idealab_private.guard_staff_scope_assignment_limit_v1();
REVOKE ALL ON FUNCTION idealab_private.guard_staff_scope_assignment_limit_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE idealab_private.staff_scope_commands_v1 (
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  command_id uuid NOT NULL,
  payload jsonb NOT NULL,
  result_revision bigint NOT NULL,
  PRIMARY KEY (actor_id, command_id)
);

-- One append-only row records each effective assignment or revocation.
CREATE TABLE idealab_private.staff_scope_history_v1 (
  scope_id uuid NOT NULL REFERENCES idealab_private.staff_scopes_v1(id),
  revision bigint NOT NULL,
  actor_id uuid,
  head_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('assign', 'revoke')),
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (scope_id, revision)
);

ALTER TABLE idealab_private.staff_scopes_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.staff_scopes_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.staff_scope_assignments_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.staff_scope_assignments_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.staff_scope_history_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.staff_scope_history_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.staff_scope_commands_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.staff_scope_commands_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON idealab_private.staff_scopes_v1, idealab_private.staff_scope_assignments_v1,
  idealab_private.staff_scope_history_v1, idealab_private.staff_scope_commands_v1
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION idealab_private.set_staff_scope_head_v1(
  p_scope uuid, p_revision bigint, p_head uuid, p_action text,
  p_reason text, p_command uuid, p_expected_actor uuid
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  current_scope idealab_private.staff_scopes_v1%ROWTYPE;
  clean_reason text := btrim(p_reason);
  command_payload jsonb;
  receipt idealab_private.staff_scope_commands_v1%ROWTYPE;
  result_revision bigint;
  active_assignment uuid;
  stamp timestamptz;
BEGIN
  IF actor IS NULL OR actor IS DISTINCT FROM p_expected_actor OR NOT EXISTS (
    SELECT 1 FROM public.users AS member
    WHERE member.id = actor AND member.is_active IS TRUE AND (
      member.role = 'super_admin' OR EXISTS (
        SELECT 1 FROM idealab_private.student_ambassadors_v1 WHERE user_id = actor
      )
    )
  ) THEN
    RAISE EXCEPTION 'Assignment access denied' USING ERRCODE = '42501';
  END IF;
  IF p_scope IS NULL OR p_revision IS NULL OR p_revision < 1 OR p_head IS NULL
    OR p_action IS NULL OR p_action NOT IN ('assign', 'revoke') OR p_command IS NULL
    OR clean_reason IS NULL OR length(clean_reason) NOT BETWEEN 1 AND 500
    OR clean_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid assignment' USING ERRCODE = '22023';
  END IF;
  -- Serialize this actor/command before taking identity and scope locks. Hash
  -- collisions only serialize unrelated commands and cannot grant authority.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('staff-scope:' || actor::text || ':' || p_command::text, 0));
  PERFORM 1 FROM auth.users WHERE id IN (actor, p_head) ORDER BY id FOR SHARE;
  PERFORM 1 FROM public.users WHERE id IN (actor, p_head) ORDER BY id FOR SHARE;
  IF NOT idealab_private.has_current_verified_email_v1() OR NOT EXISTS (
    SELECT 1 FROM public.users AS member JOIN auth.users AS account USING (id)
    WHERE member.id = actor AND member.is_active IS TRUE
      AND (member.role = 'super_admin' OR EXISTS (
        SELECT 1 FROM idealab_private.student_ambassadors_v1 WHERE user_id = actor FOR SHARE
      ))
      AND (account.banned_until IS NULL OR account.banned_until <= statement_timestamp())
  ) THEN
    RAISE EXCEPTION 'Assignment access denied' USING ERRCODE = '42501';
  END IF;

  command_payload := jsonb_build_object(
    'scope', p_scope, 'revision', p_revision::text, 'head', p_head,
    'action', p_action, 'reason', clean_reason
  );
  SELECT * INTO receipt FROM idealab_private.staff_scope_commands_v1
    WHERE actor_id = actor AND command_id = p_command;
  IF FOUND THEN
    IF receipt.payload IS DISTINCT FROM command_payload THEN
      RAISE EXCEPTION 'Command payload conflict' USING ERRCODE = '22023';
    END IF;
    RETURN receipt.result_revision;
  END IF;
  IF p_action = 'assign' AND NOT EXISTS (
      SELECT 1 FROM public.users AS member JOIN auth.users AS account USING (id)
      WHERE member.id = p_head AND member.is_active IS TRUE
        AND account.email_confirmed_at IS NOT NULL AND account.is_anonymous IS FALSE
        AND nullif(btrim(account.email), '') IS NOT NULL
        AND (account.banned_until IS NULL OR account.banned_until <= statement_timestamp())
    ) THEN
    RAISE EXCEPTION 'Invalid assignment' USING ERRCODE = '22023';
  END IF;

  -- This is the serialization point for assignment capacity, revocation and
  -- every protected action using this scope. Recheck the supplied revision only
  -- after acquiring it, then mutate the assignment and history atomically.
  SELECT * INTO current_scope FROM idealab_private.staff_scopes_v1
    WHERE id = p_scope FOR UPDATE;
  IF NOT FOUND OR current_scope.revision IS DISTINCT FROM p_revision THEN
    RAISE EXCEPTION 'Assignment revision conflict' USING ERRCODE = '40001';
  END IF;
  SELECT id INTO active_assignment FROM idealab_private.staff_scope_assignments_v1
    WHERE scope_id = p_scope AND user_id = p_head AND revoked_at IS NULL;
  IF p_action = 'assign' AND active_assignment IS NULL THEN
    stamp := clock_timestamp();
    INSERT INTO idealab_private.staff_scope_assignments_v1
      (scope_id, user_id, assigned_by, assigned_at, assignment_reason)
    VALUES (p_scope, p_head, actor, stamp, clean_reason);
    result_revision := current_scope.revision + 1;
  ELSIF p_action = 'revoke' AND active_assignment IS NOT NULL THEN
    stamp := clock_timestamp();
    UPDATE idealab_private.staff_scope_assignments_v1
    SET revoked_by = actor, revoked_at = stamp, revocation_reason = clean_reason
    WHERE id = active_assignment;
    result_revision := current_scope.revision + 1;
  ELSE
    result_revision := current_scope.revision;
  END IF;
  IF result_revision <> current_scope.revision THEN
    UPDATE idealab_private.staff_scopes_v1
    SET revision = result_revision WHERE id = p_scope;
    INSERT INTO idealab_private.staff_scope_history_v1
      (scope_id, revision, actor_id, head_id, action, reason, recorded_at)
    VALUES (p_scope, result_revision, actor, p_head, p_action, clean_reason, stamp);
  END IF;
  INSERT INTO idealab_private.staff_scope_commands_v1 (actor_id, command_id, payload, result_revision)
    VALUES (actor, p_command, command_payload, result_revision);
  RETURN result_revision;
END;
$$;

CREATE FUNCTION public.set_staff_scope_head_v1(
  p_scope uuid, p_revision bigint, p_head uuid, p_action text,
  p_reason text, p_command uuid, p_expected_actor uuid
) RETURNS bigint LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT idealab_private.set_staff_scope_head_v1(
    p_scope, p_revision, p_head, p_action, p_reason, p_command, p_expected_actor
  );
$$;
REVOKE ALL ON FUNCTION public.set_staff_scope_head_v1(uuid, bigint, uuid, text, text, uuid, uuid),
  idealab_private.set_staff_scope_head_v1(uuid, bigint, uuid, text, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_staff_scope_head_v1(uuid, bigint, uuid, text, text, uuid, uuid),
  idealab_private.set_staff_scope_head_v1(uuid, bigint, uuid, text, text, uuid, uuid) TO authenticated;

-- Internal only. The caller resolves scope from the protected resource and
-- performs the business write in the same transaction. Lock the scope before
-- checking the assignment so revocation and protected work serialize.
CREATE FUNCTION idealab_private.require_staff_scope_head_v1(p_scope uuid, p_kind text)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  PERFORM 1 FROM auth.users
  WHERE id = actor AND (banned_until IS NULL OR banned_until <= statement_timestamp())
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff scope access denied' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.users WHERE id = actor AND is_active IS TRUE FOR SHARE;
  IF NOT FOUND OR NOT idealab_private.has_current_verified_email_v1() THEN
    RAISE EXCEPTION 'Staff scope access denied' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM idealab_private.staff_scopes_v1
  WHERE id = p_scope AND kind = p_kind FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM idealab_private.staff_scope_assignments_v1
    WHERE scope_id = p_scope AND user_id = actor AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Staff scope access denied' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION idealab_private.require_staff_scope_head_v1(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
