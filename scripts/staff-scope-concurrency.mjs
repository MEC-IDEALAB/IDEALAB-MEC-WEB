import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Runs only through db-runtime.mjs against its own disposable cluster.
export async function checkStaffScopeConcurrency(sql) {
  const scope = '10000000-0000-0000-0000-000000000001';
  const machineScope = '10000000-0000-0000-0000-000000000002';
  const request = '30000000-0000-0000-0000-000000000001';
  const admin = '00000000-0000-0000-0000-000000000001';
  const head = '00000000-0000-0000-0000-000000000002';
  const tag = 'staff_scope_' + randomUUID().replaceAll('-', '');
  const transaction = (actor, application, body) => `
    BEGIN;
    SET LOCAL statement_timeout = '10000';
    SET LOCAL lock_timeout = '8000';
    SET LOCAL application_name = '${application}';
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub', '${actor}', true);
    ${body}
    COMMIT;`;
  const assign = (target, action, revision, command = randomUUID()) =>
    `SELECT public.set_staff_scope_head_v1('${scope}', ${revision}, '${target}', '${action}', 'Concurrency fixture', '${command}', '${admin}');`;
  const work = `SELECT public.fixture_staff_action('${scope}', 'events');`;
  const observe = requestPromise => requestPromise.then(
    value => ({ ok: true, value }),
    error => ({ ok: false, error }),
  );

  async function waitForSession(application, waitType) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const result = await sql(`SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity
        WHERE application_name = '${application}' AND state = 'active'
          AND wait_event_type = '${waitType}'
      );`);
      if (result.stdout.trim() === 't') return;
      await delay(25);
    }
    assert.fail(`Did not observe fixture session waiting on ${waitType}`);
  }

  // Race two direct, privileged fixture assignments for the final slot. The
  // database trigger must serialize both through the scope row and reject one.
  const activeBefore = Number((await sql(`SELECT count(*) FROM idealab_private.staff_scope_assignments_v1
    WHERE scope_id='${machineScope}' AND revoked_at IS NULL;`)).stdout.trim());
  assert.equal(activeBefore, 1, 'fixture has one active Machine Head before the capacity race');
  const candidates = ['00000000-0000-0000-0000-000000000006', admin];
  const insertAssignment = (user, application) => `BEGIN;
    SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='8s'; SET LOCAL application_name='${application}';
    INSERT INTO idealab_private.staff_scope_assignments_v1(scope_id,user_id,assigned_by,assignment_reason)
      VALUES ('${machineScope}','${user}','${admin}','Concurrent capacity fixture');
    SELECT pg_sleep(3); COMMIT;`;
  const firstInsertApp = tag + '_capacity_first';
  const secondInsertApp = tag + '_capacity_second';
  const firstInsert = observe(sql(insertAssignment(candidates[0], firstInsertApp)));
  let secondInsert;
  try {
    await waitForSession(firstInsertApp, 'Timeout');
    secondInsert = observe(sql(insertAssignment(candidates[1], secondInsertApp)));
    await waitForSession(secondInsertApp, 'Lock');
  } finally {
    const settled = await Promise.all([firstInsert, ...(secondInsert ? [secondInsert] : [])]);
    assert.equal(settled.filter(result => result.ok).length, 1, 'one concurrent assignment fills the final slot');
    assert.equal(settled.filter(result => !result.ok).length, 1, 'the other concurrent assignment is denied');
    assert.match(settled.find(result => !result.ok).error.stderr ?? '', /Staff scope active-head limit reached/,
      'the capacity trigger rejects the competing third head');
  }
  const activeHeads = JSON.parse((await sql(`SELECT json_agg(user_id::text ORDER BY user_id)::text
    FROM idealab_private.staff_scope_assignments_v1
    WHERE scope_id='${machineScope}' AND revoked_at IS NULL;`)).stdout.trim());
  assert.equal(activeHeads.length, 2, 'a machine scope has at most two distinct active heads after the race');
  assert.equal(new Set(activeHeads).size, 2, 'both active machine assignments are distinct');

  // Both assigned Machine Heads approve one request against the same revision.
  // The first holds the scope/request locks through commit; the second must see
  // the changed request revision and cannot produce a second transition.
  const approval = (actor, application) => transaction(actor, application, `DO $approve$
    DECLARE result_revision bigint;
    BEGIN
      result_revision := public.fixture_approve_machine_request_v1('${request}',1,'${actor}');
      IF result_revision <> 2 THEN RAISE EXCEPTION 'Unexpected approval revision'; END IF;
      PERFORM pg_sleep(3);
    END $approve$;`);
  const firstApprovalApp = tag + '_approval_first';
  const firstApproval = observe(sql(approval(activeHeads[0], firstApprovalApp)));
  let secondApproval;
  let approvalResults;
  try {
    await waitForSession(firstApprovalApp, 'Timeout');
    secondApproval = observe(sql(approval(activeHeads[1], tag + '_approval_second')));
    await waitForSession(tag + '_approval_second', 'Lock');
  } finally {
    approvalResults = await Promise.all([firstApproval, ...(secondApproval ? [secondApproval] : [])]);
  }
  assert.equal(approvalResults.filter(result => result.ok).length, 1, 'one assigned head approves the revision');
  assert.equal(approvalResults.filter(result => !result.ok).length, 1, 'concurrent second approval loses');
  assert.match(approvalResults.find(result => !result.ok).error.stderr ?? '', /Fixture request revision conflict/,
    'the second assigned head rechecks the request revision');
  const approvalState = await sql(`SELECT json_build_object(
    'revision',(SELECT revision FROM idealab_private.fixture_requests WHERE id='${request}'),
    'state',(SELECT state FROM idealab_private.fixture_requests WHERE id='${request}'),
    'transitions',(SELECT count(*) FROM idealab_private.fixture_actions WHERE scope_id='${machineScope}')
  );`);
  const parsedApprovalState = JSON.parse(approvalState.stdout);
  assert.equal(parsedApprovalState.revision, 2, 'one database request revision was committed');
  assert.equal(parsedApprovalState.state, 'approved', 'request has one final state');
  assert.equal(parsedApprovalState.transitions, 3, 'two authorization probes plus one approval transition exist');

  // Work gets the event scope lock first. Revocation must wait for its commit.
  const eventRevision = Number((await sql(`SELECT revision FROM idealab_private.staff_scopes_v1 WHERE id='${scope}';`)).stdout.trim());
  const actionCount = Number((await sql('SELECT count(*) FROM idealab_private.fixture_actions;')).stdout.trim());
  const historyCount = Number((await sql(`SELECT count(*) FROM idealab_private.staff_scope_history_v1 WHERE scope_id='${scope}';`)).stdout.trim());
  await sql(transaction(admin, tag + '_setup', assign(head, 'assign', eventRevision)));
  const workFirstApp = tag + '_work_first';
  const firstWork = observe(sql(transaction(head, workFirstApp, work + 'SELECT pg_sleep(3);')));
  let revokeAfterWork;
  try {
    await waitForSession(workFirstApp, 'Timeout');
    revokeAfterWork = observe(sql(transaction(admin, tag + '_revoke_second', assign(head, 'revoke', eventRevision + 1))));
    await waitForSession(tag + '_revoke_second', 'Lock');
  } finally {
    const settled = await Promise.all([firstWork, ...(revokeAfterWork ? [revokeAfterWork] : [])]);
    for (const result of settled) if (!result.ok) throw result.error;
  }
  assert.equal(Number((await sql('SELECT count(*) FROM idealab_private.fixture_actions;')).stdout.trim()), actionCount + 1,
    'work committed before revocation');

  await sql(transaction(admin, tag + '_restore', assign(head, 'assign', eventRevision + 2)));

  // Revocation gets the scope lock first. The waiting head fails after the
  // authoritative assignment state is rechecked and leaves no side effect.
  const revocation = observe(sql(transaction(admin, tag + '_revoke_first', assign(head, 'revoke', eventRevision + 3) + 'SELECT pg_sleep(3);')));
  let waitingHead;
  let headOutcome;
  try {
    await waitForSession(tag + '_revoke_first', 'Timeout');
    waitingHead = sql(transaction(head, tag + '_work_second', work));
    headOutcome = waitingHead.then(() => ({ denied: false }), error => ({
      denied: /Staff scope access denied/.test(error.stderr ?? ''),
    }));
    await waitForSession(tag + '_work_second', 'Lock');
  } finally {
    const result = await revocation;
    const headResult = headOutcome ? await headOutcome : null;
    if (!result.ok) throw result.error;
    if (headResult) assert.equal(headResult.denied, true, 'revoked head rejected after waiting');
  }
  assert.equal(Number((await sql('SELECT count(*) FROM idealab_private.fixture_actions;')).stdout.trim()), actionCount + 1,
    'denied waiting head wrote nothing');

  // Two simultaneous retries use one receipt and one assignment-history event.
  const retryRevision = eventRevision + 4;
  const command = randomUUID();
  await Promise.all([
    sql(transaction(admin, tag + '_retry_one', assign(head, 'assign', retryRevision, command))),
    sql(transaction(admin, tag + '_retry_two', assign(head, 'assign', retryRevision, command))),
  ]);
  const outcome = await sql(`SELECT json_build_object(
    'revision', (SELECT revision FROM idealab_private.staff_scopes_v1 WHERE id = '${scope}'),
    'receipts', (SELECT count(*) FROM idealab_private.staff_scope_commands_v1 WHERE actor_id = '${admin}' AND command_id = '${command}'),
    'changes', (SELECT count(*) FROM idealab_private.staff_scope_history_v1 WHERE scope_id = '${scope}')
  );`);
  assert.deepEqual(JSON.parse(outcome.stdout), {
    revision: eventRevision + 5, receipts: 1, changes: historyCount + 5,
  });
}
