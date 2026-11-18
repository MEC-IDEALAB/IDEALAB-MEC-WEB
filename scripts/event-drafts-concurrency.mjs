import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Only called against db-runtime's disposable synthetic cluster.
export async function checkEventDraftConcurrency(sql) {
  const actor = '00000000-0000-0000-0000-000000000002';
  const admin = '00000000-0000-0000-0000-000000000001';
  const scope = '20000000-0000-0000-0000-000000000001';
  const details = {
    title: 'Concurrent workshop', description: 'Synthetic event used to exercise concurrent writes.',
    venue: 'Test room', event_type: 'workshop', event_date: '2099-11-03T09:00:00Z',
    end_date: null, capacity: 20, audience: 'open', attendee_visibility: 'head', fee_paise: '0',
  };
  const mutate = (payload, command) => `SELECT public.mutate_event_draft_v1($payload$${JSON.stringify(payload)}$payload$::jsonb,'${command}','${actor}');`;
  const tx = body => `BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='8s'; SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub','${actor}',true); ${body} COMMIT;`;
  const observe = promise => promise.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
  const scopeRevision = (await sql(`SELECT revision::text FROM idealab_private.staff_scopes_v1 WHERE id='${scope}';`)).stdout.trim();
  await sql(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${admin}',true);
    SELECT public.set_staff_scope_head_v1('${scope}',${scopeRevision},'${actor}','assign',
      'Concurrent event fixture', '${randomUUID()}', '${admin}'); COMMIT;`);
  const create = { action: 'create', scope_id: scope, details };
  const createCommand = randomUUID();
  const creation = await Promise.all([
    observe(sql(tx(mutate(create, createCommand)))),
    observe(sql(tx(mutate(create, createCommand)))),
  ]);
  for (const result of creation) if (!result.ok) throw result.error;
  const stored = JSON.parse((await sql(`SELECT json_build_object('count',count(*),'id',min(id::text))
    FROM idealab_private.event_management_v1 WHERE details->>'title'='Concurrent workshop';`)).stdout);
  assert.equal(stored.count, 1, 'concurrent creation retry makes one draft');
  const edit = title => ({ action: 'edit', event_id: stored.id, revision: '1', details: { ...details, title } });
  const edits = await Promise.all([
    observe(sql(tx(mutate(edit('Concurrent edit one'), randomUUID())))),
    observe(sql(tx(mutate(edit('Concurrent edit two'), randomUUID())))),
  ]);
  assert.equal(edits.filter(result => result.ok).length, 1, 'one revision wins concurrent edit');
  assert(edits.filter(result => !result.ok).every(result => /Event revision conflict/.test(result.error.stderr ?? '')), 'stale edit rejected explicitly');
  const publish = { action: 'publish', event_id: stored.id, revision: '2' };
  const publications = await Promise.all([
    observe(sql(tx(mutate(publish, randomUUID())))),
    observe(sql(tx(mutate(publish, randomUUID())))),
  ]);
  assert.equal(publications.filter(result => result.ok).length, 1, 'one publication wins');
  assert(publications.filter(result => !result.ok).every(result => /Event revision conflict/.test(result.error.stderr ?? '')), 'second publication rejected explicitly');
  const outcome = JSON.parse((await sql(`SELECT json_build_object(
    'publications',(SELECT count(*) FROM public.events WHERE id='${stored.id}'),
    'attendeeVisibility',(SELECT details->>'attendee_visibility' FROM idealab_private.event_management_v1 WHERE id='${stored.id}'),
    'revision',(SELECT revision FROM idealab_private.event_management_v1 WHERE id='${stored.id}'),
    'history',(SELECT count(*) FROM idealab_private.event_management_history_v1 WHERE event_id='${stored.id}'),
    'receipts',(SELECT count(*) FROM idealab_private.event_management_commands_v1 WHERE result->>'event_id'='${stored.id}')
  );`)).stdout);
  assert.deepEqual(outcome, { publications: 1, attendeeVisibility: 'head', revision: 3, history: 3, receipts: 3 });
}
