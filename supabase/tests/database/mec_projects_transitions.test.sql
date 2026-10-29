-- Managed SQL-role fixture using the approved isolated account, not browser auth.
-- All projects, receipts and attempts created here roll back.
BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $identity$
BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active)<>1 THEN RAISE EXCEPTION 'requires one approved isolated account'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active),true);
END;
$identity$;
SET LOCAL ROLE authenticated;
DO $cases$
DECLARE r jsonb; replay jsonb; d jsonb; cmd jsonb; page jsonb; next_page jsonb;
  project_id uuid; command_id uuid:=gen_random_uuid(); old_code text; i integer;
BEGIN
  cmd:='{"kind":"create","title":"ROLLBACK project fixture","description":"Managed SQL fixture only","visibility":"private"}';
  r:=public.mutate_project_v1(cmd,command_id); project_id:=(r->>'project_id')::uuid;
  ASSERT r->>'status'='saved' AND r->>'revision'='1','create saved';
  d:=public.get_project_v1(project_id);
  ASSERT d#>>'{project,relation}'='creator' AND d#>>'{project,member_count}'='1','atomic creator membership';
  ASSERT d#>>'{members,0,role}'='lead' AND (d#>>'{members,0,is_self}')::boolean,'creator lead';
  ASSERT NOT (d::text ~ '"(name|phone|college_roll|email|user_id)"'),'no private profile projection';
  ASSERT (SELECT jsonb_array_length(public.get_projects_v1('discover','ROLLBACK project fixture',NULL,NULL)->'items'))=0,'private not discoverable';
  ASSERT (SELECT jsonb_array_length(public.get_projects_v1('mine','ROLLBACK project fixture',NULL,NULL)->'items'))=1,'own private discoverable';
  replay:=public.mutate_project_v1(cmd,command_id); ASSERT replay=r,'create replay same entity';
  ASSERT public.mutate_project_v1(cmd||'{"title":"changed"}'::jsonb,command_id)='{"status":"conflict"}'::jsonb,'same command changed intent rejected';
  ASSERT public.mutate_project_v1(jsonb_build_object('kind','leave','project_id',project_id),gen_random_uuid())='{"status":"creator_must_remain"}'::jsonb,'creator cannot leave';
  old_code:=d->>'join_code';
  r:=public.mutate_project_v1(jsonb_build_object('kind','rotate_code','project_id',project_id,'expected_revision','1'),gen_random_uuid());
  ASSERT r->>'revision'='2','rotation advances version';
  ASSERT public.get_project_v1(project_id)->>'join_code'<>old_code,'rotation changes code';
  ASSERT public.mutate_project_v1(jsonb_build_object('kind','join','code',old_code),gen_random_uuid())='{"status":"request_unavailable"}'::jsonb,'old code invalid';
  ASSERT public.mutate_project_v1(jsonb_build_object('kind','join','code',public.get_project_v1(project_id)->>'join_code'),gen_random_uuid())->>'status'='already_member','code does not duplicate existing member';
  cmd:=jsonb_build_object('kind','update','project_id',project_id,'expected_revision','1','title','Edited fixture','description','Description','visibility','public','stage','in_progress');
  ASSERT public.mutate_project_v1(cmd,gen_random_uuid())='{"status":"conflict"}'::jsonb,'stale editor conflicts';
  cmd:=cmd||'{"expected_revision":"2"}';
  r:=public.mutate_project_v1(cmd,gen_random_uuid()); ASSERT r->>'revision'='3','current editor saves';
  ASSERT public.get_project_v1(project_id)#>>'{project,status}'='in_progress','stage persists';
  ASSERT jsonb_array_length(public.get_projects_v1('discover','Edited fixture',NULL,NULL)->'items')=1,'public discoverable';
  ASSERT public.mutate_project_v1(cmd||'{"role":"admin"}',gen_random_uuid())='{"status":"invalid"}'::jsonb,'unknown authority input rejected';
  ASSERT public.mutate_project_v1(cmd||'{"expected_revision":""}',gen_random_uuid())='{"status":"invalid"}'::jsonb,'empty revision rejected';
  ASSERT public.mutate_project_v1(jsonb_build_object('kind','leave','project_id',gen_random_uuid()),gen_random_uuid())='{"status":"denied"}'::jsonb,'unknown leave generic denied';
  ASSERT public.get_project_v1(gen_random_uuid()) IS NULL,'missing detail null';
  FOR i IN 1..21 LOOP
    PERFORM public.mutate_project_v1(jsonb_build_object('kind','create','title','ROLLBACK pagination '||i,'description','Fixture','visibility','public'),gen_random_uuid());
  END LOOP;
  page:=public.get_projects_v1('discover','ROLLBACK pagination',NULL,NULL);
  ASSERT jsonb_array_length(page->'items')=20 AND page->'cursor'<>'null'::jsonb,'first page bounded';
  next_page:=public.get_projects_v1('discover','ROLLBACK pagination',(page#>>'{cursor,updated_at}')::timestamptz,(page#>>'{cursor,id}')::uuid);
  ASSERT jsonb_array_length(next_page->'items')=1 AND next_page->'cursor'='null'::jsonb,'next page complete';
  ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(page->'items') a JOIN jsonb_array_elements(next_page->'items') b ON a->>'id'=b->>'id'),'no page overlap';
  FOR i IN 1..10 LOOP PERFORM public.mutate_project_v1('{"kind":"join","code":"00000000000000000000000000000000"}',gen_random_uuid()); END LOOP;
  ASSERT public.mutate_project_v1('{"kind":"join","code":"00000000000000000000000000000000"}',gen_random_uuid())='{"status":"try_later"}'::jsonb,'code attempts bounded';
  ASSERT public.get_own_project_requests_v1()='[]'::jsonb,'own membership does not create join request';
END;
$cases$;
RESET ROLE;
DO $audit$
BEGIN
  ASSERT NOT EXISTS(SELECT 1 FROM idealab_private.project_events_v1 e LEFT JOIN idealab_private.project_commands_v1 c ON c.user_id=e.actor_id AND c.command_id=e.command_id WHERE c.command_id IS NULL),'audit linked to receipt';
END;
$audit$;
ROLLBACK;
SELECT '27 project transition assertions passed (SQL-role rollback fixture)' AS result;
