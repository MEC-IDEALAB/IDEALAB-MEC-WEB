import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const archive = JSON.parse(await readFile(new URL('../supabase/validation/ledger/project-create-applied.json', import.meta.url), 'utf8'));
const archivedSql = archive.migrations.flatMap(migration => migration.statements.map(statement => statement.sql)).join('\n');
const receiptSql = await readFile(new URL('../supabase/validation/20261029013311_isolated_project_create_receipt_v1.sql', import.meta.url), 'utf8');
const websiteActions = await readFile(new URL('../src/app/app/projects/actions.ts', import.meta.url), 'utf8');
const normalized = value => value.replace(/\s+/g, ' ');
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function assertAuthenticatedOnly(sql, signature) {
  const escaped = escapeRegExp(signature);
  assert.ok(new RegExp(`REVOKE ALL ON FUNCTION[\\s\\S]*?${escaped}[\\s\\S]*?FROM PUBLIC,anon,authenticated,service_role`).test(sql), `Missing role revocation for ${signature}.`);
  assert.ok(new RegExp(`GRANT EXECUTE ON FUNCTION[\\s\\S]*?${escaped}[\\s\\S]*?TO authenticated`).test(sql), `Missing authenticated grant for ${signature}.`);
}

test('archived validation create APIs retain the RPC signatures used by the website', () => {
  assert.deepEqual(archive.migrations.map(({ version, name }) => [version, name]), [
    ['20261030221518', 'isolated_project_create_intent_v1'],
    ['20261030221714', 'isolated_project_create_intent_fk_index_v1'],
    ['20261030223441', 'isolated_project_create_generation_v1'],
    ['20261030225748', 'isolated_project_create_write_gate_v1'],
    ['20261030232930', 'isolated_project_create_expected_actor_v1'],
    ['20261030235730', 'isolated_project_account_bound_mutation_v1'],
  ]);

  const archived = normalized(archivedSql);
  const receipt = normalized(receiptSql);
  const definitions = [
    [archived, 'public.get_own_project_create_intent_v1()', 'public.get_own_project_create_intent_v1()', /LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''/],
    [receipt, 'public.get_own_project_create_receipt_v1(p_command_id uuid)', 'public.get_own_project_create_receipt_v1(uuid)', /LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''/],
    [archived, 'public.ack_own_project_create_v1(p_command_id uuid)', 'public.ack_own_project_create_v1(uuid)', /LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''/],
    [archived, 'public.mutate_project_for_account_v1(p_command jsonb, p_command_id uuid, p_create_generation bigint, p_expected_user_id uuid)', 'public.mutate_project_for_account_v1(jsonb,uuid,bigint,uuid)', /LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''/],
  ];

  for (const [sql, signature, permissionSignature, execution] of definitions) {
    const open = signature.indexOf('(');
    const declaration = `${escapeRegExp(signature.slice(0, open + 1))}\\s*${escapeRegExp(signature.slice(open + 1, -1))}\\s*\\)`;
    const definition = new RegExp(`CREATE(?: OR REPLACE)? FUNCTION ${declaration} RETURNS jsonb ${execution.source}`);
    assert.ok(definition.test(sql), `Missing safe SQL wrapper for ${signature}.`);
    assertAuthenticatedOnly(sql, permissionSignature);
  }
});

test('website project-create adapter calls the archived names with the reviewed argument keys', () => {
  assert.match(websiteActions, /client\.rpc\('get_own_project_create_intent_v1'\)/);
  assert.match(websiteActions, /client\.rpc\('mutate_project_for_account_v1',\s*\{p_command:command,p_command_id:commandId,p_create_generation:generation,p_expected_user_id:expectedUserId\}\)/);
  assert.match(websiteActions, /client\.rpc\('get_own_project_create_receipt_v1',\s*\{p_command_id:commandId\}\)/);
  assert.match(websiteActions, /client\.rpc\('ack_own_project_create_v1',\s*\{p_command_id:commandId\}\)/);
});
