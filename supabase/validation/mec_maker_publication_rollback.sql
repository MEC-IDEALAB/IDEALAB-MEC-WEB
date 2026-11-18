-- Atomic pre-use rollback for the local maker-profile candidate only.
-- The single DO statement owns one implicit transaction, so locks, checks and
-- every DROP commit or roll back together even when this file runs standalone.
DO $rollback$
BEGIN
  EXECUTE 'LOCK TABLE idealab_private.maker_profiles_v1, '
    || 'idealab_private.maker_publication_history_v1, '
    || 'idealab_private.maker_install_state_v1 IN ACCESS EXCLUSIVE MODE';

  IF (SELECT pg_catalog.count(*) FROM idealab_private.maker_install_state_v1) <> 1
    OR EXISTS (SELECT 1 FROM idealab_private.maker_install_state_v1
      WHERE candidate_used IS DISTINCT FROM false OR first_mutation_at IS NOT NULL)
    OR EXISTS (SELECT 1 FROM idealab_private.maker_profiles_v1)
    OR EXISTS (SELECT 1 FROM idealab_private.maker_publication_history_v1)
    THEN
    RAISE EXCEPTION 'Maker profile data or mutation marker state requires an approved recovery plan';
  END IF;

  EXECUTE 'DROP FUNCTION public.takedown_maker_profile_v1(uuid,text,text)';
  EXECUTE 'DROP FUNCTION public.withdraw_own_public_profile_v1(text)';
  EXECUTE 'DROP FUNCTION public.publish_own_public_profile_v1(text)';
  EXECUTE 'DROP FUNCTION public.save_own_public_profile_v1(jsonb,text)';
  EXECUTE 'DROP FUNCTION public.get_own_public_profile_v1()';
  EXECUTE 'DROP FUNCTION idealab_private.takedown_maker_profile_v1(uuid,text,text)';
  EXECUTE 'DROP FUNCTION idealab_private.mutate_maker_profile_v1(text,text,jsonb)';
  EXECUTE 'DROP FUNCTION idealab_private.get_own_maker_profile_v1()';
  EXECUTE 'DROP FUNCTION idealab_private.maker_actor_ready_v1(uuid)';
  EXECUTE 'DROP TABLE idealab_private.maker_publication_history_v1';
  EXECUTE 'DROP TABLE idealab_private.maker_profiles_v1';
  EXECUTE 'DROP TABLE idealab_private.maker_install_state_v1';
  EXECUTE 'DROP FUNCTION idealab_private.validate_maker_draft_v1(jsonb)';
END;
$rollback$;
