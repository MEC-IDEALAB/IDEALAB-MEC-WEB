-- Replays the owner's already-attempted second-account declaration in isolation.
-- Uses existing saved details without emitting them. All effects roll back.
BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $identity$
BEGIN
  IF (SELECT count(*) FROM idealab_private.mec_registration_collision_state_v1)<>1 THEN RAISE EXCEPTION 'requires exactly the observed conflict account'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.mec_registration_collision_state_v1),true);
  PERFORM set_config('idealab_test.claim_count',(SELECT count(*)::text FROM idealab_private.mec_registration_claims_v1 WHERE claim_state='current'),true);
END;
$identity$;
SET LOCAL ROLE authenticated;
DO $cases$
DECLARE before_profile record; after_profile record; result record;
BEGIN
  SELECT * INTO STRICT before_profile FROM public.get_own_profile_v1();
  ASSERT before_profile.role='student' AND before_profile.profile_completed AND NOT before_profile.mec_admitted,'second profile complete but not admitted';
  SELECT * INTO STRICT result FROM public.claim_mec_registration_v1(before_profile.college_roll,before_profile.profile_revision,true);
  ASSERT result.status='not_claimed','existing normalized claim rejected generically';
  ASSERT result.profile_revision=before_profile.profile_revision,'rejection does not advance revision';
  SELECT * INTO STRICT after_profile FROM public.get_own_profile_v1();
  ASSERT after_profile.college_roll=before_profile.college_roll AND after_profile.profile_revision=before_profile.profile_revision,'saved details unchanged';
  ASSERT NOT after_profile.mec_admitted,'rejection grants no admission';
END;
$cases$;
RESET ROLE;
DO $integrity$
BEGIN
  ASSERT (SELECT count(*) FROM idealab_private.mec_registration_claims_v1 WHERE claim_state='current')=current_setting('idealab_test.claim_count')::integer,'existing claim preserved';
  ASSERT NOT EXISTS(SELECT 1 FROM idealab_private.mec_registration_claims_v1 WHERE claim_state='pending'),'no pending claim left';
  ASSERT idealab_private.validate_mec_claim_display_v1('LMDL24CS219'),'LMDL validator accepts lateral-entry prefix';
END;
$integrity$;
ROLLBACK;
SELECT '8 existing-account collision assertions passed; all effects rolled back' AS result;
