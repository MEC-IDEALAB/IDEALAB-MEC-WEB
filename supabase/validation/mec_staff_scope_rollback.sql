-- Pre-use rollback only. Review dependent function bodies before execution.
-- PostgreSQL does not track all references embedded in procedural function text.
LOCK TABLE idealab_private.student_ambassadors_v1, idealab_private.staff_scopes_v1,
  idealab_private.staff_scope_assignments_v1, idealab_private.staff_scope_history_v1,
  idealab_private.staff_scope_commands_v1 IN ACCESS EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM idealab_private.student_ambassadors_v1)
    OR EXISTS (SELECT 1 FROM idealab_private.staff_scopes_v1)
    OR EXISTS (SELECT 1 FROM idealab_private.staff_scope_assignments_v1)
    OR EXISTS (SELECT 1 FROM idealab_private.staff_scope_history_v1)
    OR EXISTS (SELECT 1 FROM idealab_private.staff_scope_commands_v1) THEN
    RAISE EXCEPTION 'Retained staff data requires a recovery plan';
  END IF;
END;
$preflight$;
DROP FUNCTION public.set_staff_scope_head_v1(uuid, bigint, uuid, text, text, uuid, uuid);
DROP FUNCTION idealab_private.set_staff_scope_head_v1(uuid, bigint, uuid, text, text, uuid, uuid);
DROP FUNCTION idealab_private.require_staff_scope_head_v1(uuid, text);
DROP TABLE idealab_private.staff_scope_commands_v1;
DROP TABLE idealab_private.staff_scope_history_v1;
DROP TABLE idealab_private.staff_scope_assignments_v1;
DROP FUNCTION idealab_private.guard_staff_scope_assignment_limit_v1();
DROP TABLE idealab_private.staff_scopes_v1;
DROP TABLE idealab_private.student_ambassadors_v1;
