-- Validation project only. Adds indexes for currently unindexed foreign-key
-- paths; no rows, policies, grants, or application behavior are changed.
DO $preflight$
DECLARE
  v_required text[] := ARRAY[
    'idealab_private.lab_opening_changes_v1',
    'idealab_private.own_visit_commands_v1',
    'idealab_private.project_events_v1',
    'idealab_private.work_request_events_v1',
    'public.events',
    'public.projects'
  ];
BEGIN
  IF current_user <> 'postgres'
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR EXISTS (SELECT 1 FROM unnest(v_required) AS t(name) WHERE to_regclass(t.name) IS NULL)
    OR EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE (n.nspname, c.relname) IN (
        ('idealab_private','lab_opening_changes_v1_actor_v1'),
        ('idealab_private','own_visit_commands_v1_result_visit_v1'),
        ('idealab_private','project_events_v1_project_v1'),
        ('idealab_private','project_events_v1_actor_command_v1'),
        ('idealab_private','project_events_v1_request_v1'),
        ('idealab_private','work_request_events_v1_actor_command_v1'),
        ('public','events_created_by_v1'),
        ('public','projects_created_by_v1')
      )
    ) THEN
    RAISE EXCEPTION 'unexpected validation database or index baseline';
  END IF;
END;
$preflight$;

CREATE INDEX lab_opening_changes_v1_actor_v1
  ON idealab_private.lab_opening_changes_v1(actor_id);
CREATE INDEX own_visit_commands_v1_result_visit_v1
  ON idealab_private.own_visit_commands_v1(result_visit_id);
CREATE INDEX project_events_v1_project_v1
  ON idealab_private.project_events_v1(project_id);
CREATE INDEX project_events_v1_actor_command_v1
  ON idealab_private.project_events_v1(actor_id, command_id);
CREATE INDEX project_events_v1_request_v1
  ON idealab_private.project_events_v1(request_id);
CREATE INDEX work_request_events_v1_actor_command_v1
  ON idealab_private.work_request_events_v1(actor_id, command_id);
CREATE INDEX events_created_by_v1
  ON public.events(created_by);
CREATE INDEX projects_created_by_v1
  ON public.projects(created_by);

DO $postflight$
DECLARE v_valid_indexes integer;
BEGIN
  SELECT count(*)::integer INTO v_valid_indexes
  FROM pg_class i
  JOIN pg_index x ON x.indexrelid = i.oid
  JOIN pg_namespace n ON n.oid = i.relnamespace
  WHERE x.indisvalid AND x.indisready AND (n.nspname, i.relname) IN (
    ('idealab_private','lab_opening_changes_v1_actor_v1'),
    ('idealab_private','own_visit_commands_v1_result_visit_v1'),
    ('idealab_private','project_events_v1_project_v1'),
    ('idealab_private','project_events_v1_actor_command_v1'),
    ('idealab_private','project_events_v1_request_v1'),
    ('idealab_private','work_request_events_v1_actor_command_v1'),
    ('public','events_created_by_v1'),
    ('public','projects_created_by_v1')
  );
  IF v_valid_indexes <> 8 THEN
    RAISE EXCEPTION 'expected eight valid validation foreign-key indexes; found %', v_valid_indexes;
  END IF;
END;
$postflight$;
