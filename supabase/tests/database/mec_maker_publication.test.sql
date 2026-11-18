-- Disposable PostgreSQL acceptance only; all identities are synthetic.
INSERT INTO idealab_private.student_ambassadors_v1(user_id)
  VALUES ('00000000-0000-4000-8000-000000000005');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
DO $owner$
DECLARE
  draft jsonb := '{"display_name":"Maker Six","bio":"Synthetic maker","interests":["Robotics"],"skills":["3D printing"],"links":[{"label":" Website ","url":"https://example.org/"}],"visibility":"private"}';
  invalid_label jsonb;
  receipt jsonb;
  draft_id uuid;
  first_id uuid;
  next_id uuid;
BEGIN
  ASSERT NOT has_table_privilege(current_user,'idealab_private.maker_profiles_v1','SELECT');
  ASSERT NOT has_table_privilege(current_user,'idealab_private.maker_publication_history_v1','INSERT');
  ASSERT NOT has_function_privilege('anon','public.get_own_public_profile_v1()','EXECUTE');
  ASSERT NOT has_function_privilege('anon','public.save_own_public_profile_v1(jsonb,text)','EXECUTE');
  ASSERT NOT has_function_privilege('anon','public.publish_own_public_profile_v1(text)','EXECUTE');
  ASSERT NOT has_function_privilege('anon','public.takedown_maker_profile_v1(uuid,text,text)','EXECUTE');
  ASSERT to_regprocedure('public.get_public_profile_v1(uuid)') IS NULL,
    'Anonymous public resolution stays absent until rate limiting is implemented';

  receipt := public.get_own_public_profile_v1();
  ASSERT receipt->>'status'='ready'
    AND receipt->'profile'->>'revision'='0'
    AND receipt->'profile'->>'initialized'='false'
    AND receipt->'profile'->>'visibility'='private';

  invalid_label := jsonb_set(draft,'{links,0,label}',to_jsonb(repeat(' ',59)||'ok'));
  ASSERT public.save_own_public_profile_v1(invalid_label,'0')->>'status'='invalid',
    'raw overlong link labels cannot be accepted then truncated';

  receipt := public.save_own_public_profile_v1(draft,'0');
  ASSERT receipt->>'status'='saved'
    AND receipt->'profile'->>'revision'='1'
    AND receipt->'profile'->>'visibility'='private'
    AND receipt->'profile'->>'initialized'='true';
  draft_id := (receipt->'profile'->>'public_id')::uuid;
  IF receipt->'profile'->'links'->0->>'label' IS DISTINCT FROM 'Website' THEN
    RAISE EXCEPTION 'saved link label normalization mismatch: %',
      coalesce(receipt->'profile'->'links'->0->>'label','<null>');
  END IF;

  receipt := public.publish_own_public_profile_v1('1');
  ASSERT receipt->>'status'='saved' AND receipt->'profile'->>'visibility'='public';
  first_id := (receipt->'profile'->>'public_id')::uuid;
  ASSERT first_id<>draft_id, 'first publication uses a distinct opaque URL';
  ASSERT public.save_own_public_profile_v1(draft,'2')->>'status'='invalid',
    'draft editing is blocked while currently published';
  receipt := public.get_own_public_profile_v1();
  ASSERT receipt->'profile'->>'revision'='2'
    AND receipt->'profile'->>'public_id'=first_id::text;
  receipt := public.withdraw_own_public_profile_v1('2');
  ASSERT receipt->>'status'='saved'
    AND receipt->'profile'->>'revision'='3'
    AND receipt->'profile'->>'visibility'='private';
  next_id := (receipt->'profile'->>'public_id')::uuid;
  ASSERT next_id<>first_id, 'withdrawal rotates the old opaque identifier';
  receipt := public.publish_own_public_profile_v1('3');
  ASSERT receipt->>'status'='saved'
    AND receipt->'profile'->>'revision'='4'
    AND receipt->'profile'->>'public_id'<>first_id::text
    AND receipt->'profile'->>'public_id'<>next_id::text;
  PERFORM set_config('maker_fixture.user6_share',receipt->'profile'->>'public_id',true);
  PERFORM set_config('maker_fixture.user6_revision',receipt->'profile'->>'revision',true);
  PERFORM set_config('maker_fixture.user6_original',first_id::text,true);
END;
$owner$;
RESET ROLE;

UPDATE auth.users SET banned_until=statement_timestamp()+interval '1 hour'
  WHERE id='00000000-0000-4000-8000-000000000006';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
DO $banned_session$
BEGIN
  ASSERT public.get_own_public_profile_v1()->>'status'='unauthorized';
  ASSERT public.publish_own_public_profile_v1('4')->>'status'='unauthorized';
END;
$banned_session$;
RESET ROLE;
UPDATE auth.users SET banned_until=NULL WHERE id='00000000-0000-4000-8000-000000000006';

DO $private_data$
BEGIN
  ASSERT (SELECT (SELECT count(*)=5 FROM jsonb_object_keys(profile.draft))
      AND NOT (profile.draft ? 'phone') AND NOT (profile.draft ? 'email')
      AND NOT (profile.draft ? 'college_roll')
    FROM idealab_private.maker_profiles_v1 AS profile
    WHERE profile.owner_id='00000000-0000-4000-8000-000000000006'),
    'private account fields are absent from the maker profile contract';
END;
$private_data$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $denied_takedown$
BEGIN
  ASSERT public.takedown_maker_profile_v1(
    current_setting('maker_fixture.user6_share')::uuid,
    current_setting('maker_fixture.user6_revision'),
    'safety'
  )->>'status'='unauthorized';
END;
$denied_takedown$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
DO $ambassador_takedown$
DECLARE receipt jsonb; rotated uuid;
BEGIN
  receipt := public.takedown_maker_profile_v1(
    current_setting('maker_fixture.user6_share')::uuid,
    current_setting('maker_fixture.user6_revision'),
    'safety'
  );
  ASSERT receipt->>'status'='saved' AND receipt->>'revision'='5';
  rotated := (receipt->>'share_id')::uuid;
  ASSERT rotated<>current_setting('maker_fixture.user6_share')::uuid;
  PERFORM set_config('maker_fixture.user6_rotated',rotated::text,true);
  ASSERT public.get_own_public_profile_v1()->'profile'->>'visibility'='private';
END;
$ambassador_takedown$;
RESET ROLE;

DO $takedown_state$
BEGIN
  ASSERT (SELECT published IS NULL AND publication_hold IS TRUE AND revision=5
    FROM idealab_private.maker_profiles_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000006'),
    'takedown withdraws and holds publication without losing the private draft';
  ASSERT (SELECT draft->>'bio'='Synthetic maker' FROM idealab_private.maker_profiles_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000006');
END;
$takedown_state$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
DO $held_profile$
BEGIN
  ASSERT public.publish_own_public_profile_v1('5')->>'status'='invalid',
    'takedown hold prevents owner republishing';
END;
$held_profile$;

-- The Student Ambassador path is distinct from persisted Super Admin role.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
DO $ambassador_owner$
DECLARE receipt jsonb;
BEGIN
  receipt := public.get_own_public_profile_v1();
  ASSERT receipt->>'status'='ready' AND receipt->'profile'->>'revision'='0';
  receipt := public.save_own_public_profile_v1(
    '{"display_name":"Ambassador","bio":"Synthetic profile","interests":["Art"],"skills":[],"links":[],"visibility":"private"}',
    '0'
  );
  ASSERT receipt->>'status'='saved';
  receipt := public.publish_own_public_profile_v1('1');
  ASSERT receipt->>'status'='saved' AND receipt->'profile'->>'visibility'='public';
  PERFORM set_config('maker_fixture.user5_share',receipt->'profile'->>'public_id',true);
END;
$ambassador_owner$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
DO $superadmin_takedown$
DECLARE receipt jsonb;
BEGIN
  receipt := public.takedown_maker_profile_v1(
    current_setting('maker_fixture.user5_share')::uuid,'2','policy'
  );
  ASSERT receipt->>'status'='saved' AND receipt->>'revision'='3',
    'persisted Super Admin can perform the same audited takedown';
END;
$superadmin_takedown$;
RESET ROLE;

DELETE FROM idealab_private.student_ambassadors_v1 WHERE user_id='00000000-0000-4000-8000-000000000005';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
SELECT set_config('request.jwt.claims','{"role":"super_admin"}',true);
DO $revoked_ambassador$
BEGIN
  ASSERT public.takedown_maker_profile_v1(
    '00000000-0000-4000-8000-000000000099','1','policy'
  )->>'status'='unauthorized',
  'removed database assignment overrides forged JWT role metadata';
END;
$revoked_ambassador$;
RESET ROLE;

DO $history_and_legacy$
DECLARE
  relation_name text;
  grantee_name text;
  privilege_name text;
  column_privilege text;
  function_signature text;
BEGIN
  ASSERT (SELECT count(*)=3 FROM idealab_private.maker_publication_history_v1 WHERE operation='publish');
  ASSERT (SELECT count(*)=1 FROM idealab_private.maker_publication_history_v1 WHERE operation='withdraw');
  ASSERT (SELECT count(*)=2 FROM idealab_private.maker_publication_history_v1 WHERE operation='takedown');
  ASSERT EXISTS (SELECT 1 FROM idealab_private.maker_publication_history_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000006' AND revision=2
      AND actor_id='00000000-0000-4000-8000-000000000006' AND operation='publish'
      AND reason_code IS NULL AND share_id=current_setting('maker_fixture.user6_original')::uuid),
    'first publication audit stores the newly issued opaque share id';
  ASSERT EXISTS (SELECT 1 FROM idealab_private.maker_publication_history_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000006' AND revision=3
      AND actor_id='00000000-0000-4000-8000-000000000006' AND operation='withdraw'
      AND reason_code IS NULL AND share_id=current_setting('maker_fixture.user6_original')::uuid),
    'withdrawal audit retains the previously published opaque share id';
  ASSERT EXISTS (SELECT 1 FROM idealab_private.maker_publication_history_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000006' AND revision=4
      AND actor_id='00000000-0000-4000-8000-000000000006' AND operation='publish'
      AND reason_code IS NULL AND share_id=current_setting('maker_fixture.user6_share')::uuid),
    'republish audit stores the newly issued opaque share id';
  ASSERT EXISTS (SELECT 1 FROM idealab_private.maker_publication_history_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000006' AND revision=5
      AND actor_id='00000000-0000-4000-8000-000000000005' AND operation='takedown'
      AND reason_code='safety' AND share_id=current_setting('maker_fixture.user6_share')::uuid),
    'Student Ambassador takedown audit stores actor, reason and revoked share id';
  ASSERT EXISTS (SELECT 1 FROM idealab_private.maker_publication_history_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000005' AND revision=2
      AND actor_id='00000000-0000-4000-8000-000000000005' AND operation='publish'
      AND reason_code IS NULL AND share_id=current_setting('maker_fixture.user5_share')::uuid),
    'Student Ambassador self-publication audit stores its new share id';
  ASSERT EXISTS (SELECT 1 FROM idealab_private.maker_publication_history_v1
    WHERE owner_id='00000000-0000-4000-8000-000000000005' AND revision=3
      AND actor_id='00000000-0000-4000-8000-000000000006' AND operation='takedown'
      AND reason_code='policy' AND share_id=current_setting('maker_fixture.user5_share')::uuid),
    'Super Admin takedown audit stores actor, reason and revoked share id';
  ASSERT (SELECT bio='legacy fixture' FROM public.user_profiles
    WHERE user_id='00000000-0000-4000-8000-000000000005'),
    'unrelated legacy profile fixture remains intact';
  FOREACH relation_name IN ARRAY ARRAY[
    'idealab_private.maker_profiles_v1',
    'idealab_private.maker_publication_history_v1',
    'idealab_private.maker_install_state_v1'
  ] LOOP
    FOREACH grantee_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY[
        'SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'
      ] LOOP
        ASSERT NOT has_table_privilege(grantee_name,relation_name,privilege_name),
          format('%s must not have %s on %s',grantee_name,privilege_name,relation_name);
      END LOOP;
      FOREACH column_privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        ASSERT NOT has_any_column_privilege(grantee_name,relation_name,column_privilege),
          format('%s must not have column %s on %s',grantee_name,column_privilege,relation_name);
      END LOOP;
    END LOOP;
  END LOOP;
  ASSERT has_function_privilege('authenticated','public.get_own_public_profile_v1()','EXECUTE');
  ASSERT has_function_privilege('authenticated','public.save_own_public_profile_v1(jsonb,text)','EXECUTE');
  ASSERT has_function_privilege('authenticated','public.publish_own_public_profile_v1(text)','EXECUTE');
  ASSERT has_function_privilege('authenticated','public.withdraw_own_public_profile_v1(text)','EXECUTE');
  ASSERT has_function_privilege('authenticated','public.takedown_maker_profile_v1(uuid,text,text)','EXECUTE');
  FOREACH grantee_name IN ARRAY ARRAY['anon','service_role'] LOOP
    ASSERT NOT has_function_privilege(grantee_name,'public.get_own_public_profile_v1()','EXECUTE');
    ASSERT NOT has_function_privilege(grantee_name,'public.save_own_public_profile_v1(jsonb,text)','EXECUTE');
    ASSERT NOT has_function_privilege(grantee_name,'public.publish_own_public_profile_v1(text)','EXECUTE');
    ASSERT NOT has_function_privilege(grantee_name,'public.withdraw_own_public_profile_v1(text)','EXECUTE');
    ASSERT NOT has_function_privilege(grantee_name,'public.takedown_maker_profile_v1(uuid,text,text)','EXECUTE');
  END LOOP;
  FOREACH grantee_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    FOREACH function_signature IN ARRAY ARRAY[
      'idealab_private.validate_maker_draft_v1(jsonb)',
      'idealab_private.maker_actor_ready_v1(uuid)',
      'idealab_private.get_own_maker_profile_v1()',
      'idealab_private.mutate_maker_profile_v1(text,text,jsonb)',
      'idealab_private.takedown_maker_profile_v1(uuid,text,text)'
    ] LOOP
      ASSERT NOT has_function_privilege(grantee_name,function_signature,'EXECUTE'),
        format('%s must not execute %s',grantee_name,function_signature);
    END LOOP;
  END LOOP;
END;
$history_and_legacy$;

-- A drifting helper that returns NULL must not authorize a student.
CREATE OR REPLACE FUNCTION idealab_private.current_student_mec_admitted_v1()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $null_admission$
  SELECT NULL::boolean;
$null_admission$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $null_admission_denied$
BEGIN
  ASSERT public.get_own_public_profile_v1()->>'status'='unauthorized';
  ASSERT public.save_own_public_profile_v1(
    '{"display_name":"No access","bio":"No access","interests":["Art"],"skills":[],"links":[],"visibility":"private"}',
    '0'
  )->>'status'='unauthorized';
END;
$null_admission_denied$;
RESET ROLE;

-- If the use-marker row disappears, owner mutations fail closed and do not
-- advance the stored profile revision. This is an isolated synthetic test.
DELETE FROM idealab_private.maker_install_state_v1 WHERE singleton=1;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
DO $missing_marker_denied$
DECLARE rejected boolean := false; caught_message text;
BEGIN
  BEGIN
    PERFORM public.save_own_public_profile_v1(
      '{"display_name":"Maker Six","bio":"Synthetic maker","interests":["Robotics"],"skills":["3D printing"],"links":[{"label":"Website","url":"https://example.org/"}],"visibility":"private"}',
      '5'
    );
  EXCEPTION WHEN OTHERS THEN
    caught_message := SQLERRM;
    rejected := caught_message='Maker profile candidate use marker is missing';
  END;
  ASSERT rejected, 'owner mutation fails closed when the install-use marker is missing';
  ASSERT public.get_own_public_profile_v1()->'profile'->>'revision'='5',
    'marker failure leaves the owner profile revision unchanged';
END;
$missing_marker_denied$;
RESET ROLE;
INSERT INTO idealab_private.maker_install_state_v1(singleton,candidate_used,first_mutation_at)
  VALUES(1,true,clock_timestamp());
