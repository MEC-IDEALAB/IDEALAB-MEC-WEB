import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Runs only inside db-runtime's disposable PostgreSQL cluster.
export async function checkProjectAdmissionConcurrency(sql) {
  const actor = '00000000-0000-4000-8000-000000000007';
  const project = '90000000-0000-4000-8000-000000000001';
  const tag = 'project_admission_' + randomUUID().replaceAll('-', '');

  await sql(`
    INSERT INTO public.projects(id,title,description,visibility,status,created_by)
      VALUES('${project}','Profile revocation race','Synthetic concurrency fixture','private','ideation','${actor}');
    INSERT INTO idealab_private.project_controls_v1(project_id) VALUES('${project}');
  `);

  const observe = request => request.then(
    value => ({ ok: true, value }),
    error => ({ ok: false, error }),
  );

  async function waitForSession(application, waitType) {
    for (let attempt = 0; attempt < 160; attempt++) {
      const result = await sql(`SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity
        WHERE application_name='${application}' AND state='active'
          AND wait_event_type='${waitType}'
      );`);
      if (result.stdout.trim() === 't') return;
      await delay(25);
    }
    assert.fail(`Did not observe project mutation waiting on ${waitType}`);
  }

  const revoke = observe(sql(`
    BEGIN;
    SET LOCAL statement_timeout='10s';
    SET LOCAL lock_timeout='8s';
    SET LOCAL application_name='${tag}_revoke';
    UPDATE public.users SET is_active=false WHERE id='${actor}';
    SELECT pg_sleep(3);
    COMMIT;
  `));

  let mutation;
  let waitFailure;
  try {
    await waitForSession(tag + '_revoke', 'Timeout');
    mutation = observe(sql(`
      BEGIN;
      SET LOCAL statement_timeout='10s';
      SET LOCAL lock_timeout='8s';
      SET LOCAL application_name='${tag}_mutation';
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub','${actor}',true);
      DO $race$
      DECLARE receipt jsonb;
      BEGIN
        receipt:=public.mutate_project_v1(jsonb_build_object(
          'kind','update','project_id','${project}','expected_revision','1',
          'title','Must not update','description','Profile eligibility changed while waiting',
          'visibility','private','stage','in_progress'),gen_random_uuid());
        IF receipt->>'status' IS DISTINCT FROM 'denied' THEN
          RAISE EXCEPTION 'Profile-revoked mutation was not denied';
        END IF;
      END $race$;
      COMMIT;
    `));
    await waitForSession(tag + '_mutation', 'Lock');
  } catch (error) {
    waitFailure = error;
  }

  const settled = await Promise.all([revoke, ...(mutation ? [mutation] : [])]);
  if (!settled[0].ok) throw settled[0].error;
  if (settled[1] && !settled[1].ok) throw settled[1].error;
  if (waitFailure) throw waitFailure;

  const unchanged = await sql(`SELECT p.status='ideation' AND p.title='Profile revocation race' AND c.revision=1
    FROM public.projects p JOIN idealab_private.project_controls_v1 c ON c.project_id=p.id
    WHERE p.id='${project}';`);
  assert.equal(unchanged.stdout.trim(), 't', 'Eligibility loss during the profile-lock wait makes no project change.');

  await sql(`
    UPDATE public.users SET is_active=true WHERE id='${actor}';
    DELETE FROM public.projects WHERE id='${project}';
  `);
}
