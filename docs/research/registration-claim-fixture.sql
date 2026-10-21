-- Disposable model-level fixture for the approved Free validation project.
-- Every object is temporary and the transaction is rolled back. This exercises
-- normalized uniqueness, pending-to-current transitions, old-claim preservation,
-- and the proposed rolling collision boundary only. It does not test Auth, RLS,
-- API grants, application RPC code, Flutter, or the production catalog.
BEGIN;

CREATE TEMP TABLE fixture_users (
  user_id bigint PRIMARY KEY,
  college_roll text NOT NULL,
  profile_revision bigint NOT NULL DEFAULT 0
);

CREATE TEMP TABLE fixture_claims (
  claim_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL,
  normalized_value text COLLATE idealab_private.mec_registration_ci NOT NULL,
  display_value text NOT NULL,
  state text NOT NULL CHECK (state IN ('current', 'pending')),
  attested_at timestamptz NOT NULL,
  attestation_version integer NOT NULL
);

CREATE UNIQUE INDEX fixture_claims_normalized_unique
  ON fixture_claims (normalized_value);
CREATE UNIQUE INDEX fixture_claims_one_current_per_user
  ON fixture_claims (user_id) WHERE state = 'current';
CREATE UNIQUE INDEX fixture_claims_one_pending_per_user
  ON fixture_claims (user_id) WHERE state = 'pending';

CREATE TEMP TABLE fixture_attempt_state (
  user_id bigint PRIMARY KEY,
  collision_at timestamptz[] NOT NULL
);

INSERT INTO fixture_users (user_id, college_roll)
VALUES (1, 'MDL24CS219'), (2, 'MDL24CS220'), (3, 'MDL24CS221');

INSERT INTO fixture_claims
  (user_id, normalized_value, display_value, state, attested_at, attestation_version)
VALUES
  (1, 'MDL24CS219', 'MDL24CS219', 'current', '2026-10-21 10:00:00+00', 1),
  (2, 'MDL24CS220', 'MDL24CS220', 'current', '2026-10-21 10:00:00+00', 1);

DO $fixture$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_claim_id bigint;
  v_old_claim_id bigint;
  v_old_revision bigint;
  v_old_roll text;
  v_old_display text;
  v_old_attested_at timestamptz;
  v_old_attestation_version integer;
  v_attempts timestamptz[] := '{}'::timestamptz[];
  v_recent timestamptz[];
  v_boundary timestamptz;
  v_i integer;
  v_collision_count integer := 0;
  v_throttle_count integer := 0;
BEGIN
  -- POSIX whitespace normalization plus ICU comparison follows the recorded
  -- contract: case and repeated whitespace compare equal; punctuation remains.
  IF NOT (
    btrim(regexp_replace(E'  mdl24cs219\t', '[[:space:]]+', ' ', 'g'))
      COLLATE idealab_private.mec_registration_ci
    =
    btrim(regexp_replace('MDL24CS219', '[[:space:]]+', ' ', 'g'))
      COLLATE idealab_private.mec_registration_ci
  ) THEN
    RAISE EXCEPTION 'case/outer-whitespace vector did not compare equal';
  END IF;

  IF btrim(regexp_replace('MDL-24', '[[:space:]]+', ' ', 'g'))
      COLLATE idealab_private.mec_registration_ci
    = btrim(regexp_replace('MDL 24', '[[:space:]]+', ' ', 'g'))
      COLLATE idealab_private.mec_registration_ci THEN
    RAISE EXCEPTION 'punctuation vector unexpectedly compared equal';
  END IF;

  -- A changed claim colliding with another user's current claim must leave the
  -- old current claim and profile revision intact; only the targeted normalized
  -- value conflict is handled without aborting the transaction.
  SELECT claim_id, display_value, attested_at, attestation_version
  INTO v_old_claim_id, v_old_display, v_old_attested_at,
    v_old_attestation_version
  FROM fixture_claims
  WHERE user_id = 1 AND state = 'current';
  SELECT profile_revision, college_roll INTO v_old_revision, v_old_roll
  FROM fixture_users WHERE user_id = 1;

  INSERT INTO fixture_claims
    (user_id, normalized_value, display_value, state, attested_at, attestation_version)
  VALUES
    (1, 'mdl24cs220', 'mdl24cs220', 'pending', v_now, 1)
  ON CONFLICT (normalized_value) DO NOTHING
  RETURNING claim_id INTO v_claim_id;

  IF v_claim_id IS NOT NULL THEN
    RAISE EXCEPTION 'occupied normalized value was reserved';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM fixture_claims
    WHERE claim_id = v_old_claim_id AND state = 'current'
      AND normalized_value = 'MDL24CS219' COLLATE idealab_private.mec_registration_ci
      AND display_value = v_old_display
      AND attested_at = v_old_attested_at
      AND attestation_version = v_old_attestation_version
  ) THEN
    RAISE EXCEPTION 'collision changed current claim identity, display, or attestation';
  END IF;
  IF (SELECT profile_revision FROM fixture_users WHERE user_id = 1)
      <> v_old_revision OR
     (SELECT college_roll FROM fixture_users WHERE user_id = 1)
      <> v_old_roll THEN
    RAISE EXCEPTION 'collision changed the profile revision or display value';
  END IF;

  -- First five occupied attempts are processed and recorded; the sixth is
  -- throttled before its candidate is checked.
  FOR v_i IN 1..6 LOOP
    IF cardinality(v_attempts) >= 5 THEN
      v_throttle_count := v_throttle_count + 1;
      CONTINUE;
    END IF;

    v_claim_id := NULL;
    INSERT INTO fixture_claims
      (user_id, normalized_value, display_value, state, attested_at, attestation_version)
    VALUES
      (3, 'MDL24CS220', 'MDL24CS220', 'pending', v_now, 1)
    ON CONFLICT (normalized_value) DO NOTHING
    RETURNING claim_id INTO v_claim_id;

    IF v_claim_id IS NOT NULL THEN
      RAISE EXCEPTION 'occupied value unexpectedly accepted on attempt %', v_i;
    END IF;
    v_attempts := array_append(v_attempts, v_now);
    v_collision_count := v_collision_count + 1;
  END LOOP;

  IF v_collision_count <> 5 OR v_throttle_count <> 1 THEN
    RAISE EXCEPTION 'attempt boundary failed: collisions %, throttled %',
      v_collision_count, v_throttle_count;
  END IF;
  INSERT INTO fixture_attempt_state (user_id, collision_at)
  VALUES (3, v_attempts);
  SELECT collision_at INTO v_attempts
  FROM fixture_attempt_state WHERE user_id = 3;
  IF cardinality(v_attempts) <> 5 THEN
    RAISE EXCEPTION 'committed collision timestamp state was not preserved';
  END IF;

  -- Prune one just-before, one exact-boundary, and two live timestamps from the
  -- state row. The rolling window is exclusive at exactly 15 minutes.
  v_boundary := v_now - interval '15 minutes';
  v_attempts := ARRAY[
    v_boundary - interval '1 microsecond',
    v_boundary,
    v_boundary + interval '1 microsecond',
    v_now
  ];
  INSERT INTO fixture_attempt_state (user_id, collision_at)
  VALUES (4, v_attempts);
  SELECT collision_at INTO v_attempts
  FROM fixture_attempt_state WHERE user_id = 4;
  SELECT coalesce(array_agg(t ORDER BY t), '{}'::timestamptz[])
  INTO v_recent
  FROM unnest(v_attempts) AS entry(t)
  WHERE t > v_boundary AND t <= v_now;
  UPDATE fixture_attempt_state SET collision_at = v_recent WHERE user_id = 4;
  SELECT collision_at INTO v_attempts
  FROM fixture_attempt_state WHERE user_id = 4;
  IF cardinality(v_attempts) <> 2
     OR v_attempts[1] <> v_boundary + interval '1 microsecond'
     OR v_attempts[2] <> v_now THEN
    RAISE EXCEPTION 'rolling-window pruning did not keep exactly the live timestamps';
  END IF;

  -- If all entries expire, the proposed next-call cleanup removes the empty row.
  INSERT INTO fixture_attempt_state (user_id, collision_at)
  VALUES (5, ARRAY[v_boundary]);
  SELECT coalesce(array_agg(t ORDER BY t), '{}'::timestamptz[])
  INTO v_recent
  FROM unnest(ARRAY[v_boundary]) AS entry(t)
  WHERE t > v_boundary AND t <= v_now;
  UPDATE fixture_attempt_state SET collision_at = v_recent WHERE user_id = 5;
  DELETE FROM fixture_attempt_state
  WHERE user_id = 5 AND cardinality(collision_at) = 0;
  IF EXISTS (SELECT 1 FROM fixture_attempt_state WHERE user_id = 5) THEN
    RAISE EXCEPTION 'empty attempt state was not pruned';
  END IF;

  -- Changed claim reserves a pending value first, then atomically replaces the
  -- current row and advances the profile revision.
  INSERT INTO fixture_claims
    (user_id, normalized_value, display_value, state, attested_at, attestation_version)
  VALUES
    (1, 'MDL24CS223', 'MDL24CS223', 'pending', v_now, 1)
  RETURNING claim_id INTO v_claim_id;
  DELETE FROM fixture_claims
  WHERE user_id = 1 AND state = 'current';
  UPDATE fixture_claims SET state = 'current'
  WHERE claim_id = v_claim_id AND state = 'pending';
  UPDATE fixture_users
  SET college_roll = 'MDL24CS223', profile_revision = profile_revision + 1
  WHERE user_id = 1;

  IF EXISTS (SELECT 1 FROM fixture_claims WHERE state = 'pending')
     OR NOT EXISTS (
       SELECT 1 FROM fixture_claims
       WHERE user_id = 1 AND state = 'current'
         AND normalized_value = 'MDL24CS223'
           COLLATE idealab_private.mec_registration_ci
     )
     OR (SELECT profile_revision FROM fixture_users WHERE user_id = 1)
       <> v_old_revision + 1 THEN
    RAISE EXCEPTION 'pending-to-current transition failed';
  END IF;

  RAISE NOTICE 'PASS: normalization, collision preservation, five/six boundary, expiry, and claim transition';
END;
$fixture$;

SELECT 'PASS: claim-fixture assertions completed; rollback follows' AS fixture_result;

ROLLBACK;
