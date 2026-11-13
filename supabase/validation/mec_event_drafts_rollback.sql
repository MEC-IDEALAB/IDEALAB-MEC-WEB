-- Pre-use only. Review dependent function bodies before execution.
-- Never delete retained drafts, publication history or command receipts here.
LOCK TABLE idealab_private.event_management_v1, idealab_private.event_management_commands_v1,
  idealab_private.event_management_history_v1 IN ACCESS EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM idealab_private.event_management_v1)
    OR EXISTS (SELECT 1 FROM idealab_private.event_management_commands_v1)
    OR EXISTS (SELECT 1 FROM idealab_private.event_management_history_v1) THEN
    RAISE EXCEPTION 'Retained event data requires a recovery plan';
  END IF;
END;
$preflight$;
DROP FUNCTION public.mutate_event_draft_v1(jsonb,uuid,uuid);
DROP FUNCTION IF EXISTS public.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid);
DROP FUNCTION IF EXISTS public.get_event_management_scopes_v1(uuid);
DROP FUNCTION IF EXISTS idealab_private.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid);
DROP FUNCTION IF EXISTS idealab_private.get_event_management_scopes_v1(uuid);
DROP FUNCTION IF EXISTS idealab_private.require_event_manager_identity_v1(uuid);
DROP FUNCTION idealab_private.mutate_event_draft_v1(jsonb,uuid,uuid);
DROP FUNCTION idealab_private.valid_event_draft_v1(jsonb);
DROP TABLE idealab_private.event_management_commands_v1;
DROP TABLE idealab_private.event_management_history_v1;
DROP TABLE idealab_private.event_management_v1;
