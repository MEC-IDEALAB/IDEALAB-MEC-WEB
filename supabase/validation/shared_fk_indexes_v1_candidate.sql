-- CANDIDATE ONLY: no authorization to install on shared production.
-- Target metadata: huftzhfqnnslvnfzvbex, catalog/advisor rechecked 2026-11-18.
-- The advisor reports eight findings; catalog also found tool_bookings(tool_id)
-- has only status-filtered indexes, so this candidate covers that ninth FK too.
-- Rehearse only on db-runtime's disposable synthetic cluster.
-- A future approved installer must verify the actual project out-of-band, then
-- SET idealab.reviewed_project_ref = 'huftzhfqnnslvnfzvbex' in this session.
-- This explicit intent marker is NOT proof of server identity or authorization.
-- Regular transactional index builds take SHARE locks and block table writes.
-- Bounded timeouts fail the whole transaction; maintenance approval is required.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
DO $migration$
DECLARE
  item record;
  relation oid;
  attribute smallint;
  existing oid;
  expected_definition text;
BEGIN
  IF current_setting('idealab.reviewed_project_ref', true) IS DISTINCT FROM 'huftzhfqnnslvnfzvbex' THEN
    RAISE EXCEPTION 'explicit reviewed shared-project intent is required';
  END IF;
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'PostgreSQL 17 or newer required';
  END IF;
  FOR item IN SELECT * FROM (VALUES
    ('events', 'club_id', 'events_club_id_fkey', 'clubs', 'idealab_fk_events_club_id_v1'),
    ('events', 'created_by', 'events_created_by_fkey', 'users', 'idealab_fk_events_created_by_v1'),
    ('knowledge_articles', 'author_id', 'knowledge_articles_author_id_fkey', 'users', 'idealab_fk_knowledge_articles_author_id_v1'),
    ('project_members', 'user_id', 'project_members_user_id_fkey', 'users', 'idealab_fk_project_members_user_id_v1'),
    ('projects', 'club_id', 'projects_club_id_fkey', 'clubs', 'idealab_fk_projects_club_id_v1'),
    ('tool_bookings', 'project_id', 'fk_bookings_project', 'projects', 'idealab_fk_tool_bookings_project_id_v1'),
    ('tool_bookings', 'tool_id', 'tool_bookings_tool_id_fkey', 'tools', 'idealab_fk_tool_bookings_tool_id_v1'),
    ('tool_bookings', 'approved_by', 'tool_bookings_approved_by_fkey', 'users', 'idealab_fk_tool_bookings_approved_by_v1'),
    ('users', 'club_id', 'fk_users_club', 'clubs', 'idealab_fk_users_club_id_v1')
  ) AS spec(table_name, column_name, constraint_name, referenced_table, index_name)
  LOOP
    relation := to_regclass(format('public.%I', item.table_name));
    IF relation IS NULL THEN
      RAISE EXCEPTION 'missing shared FK table: public.%', item.table_name;
    END IF;
    -- Serialize DDL before reading the column/constraint baseline.
    EXECUTE format('LOCK TABLE public.%I IN SHARE MODE', item.table_name);
    SELECT attnum INTO attribute FROM pg_attribute
      WHERE attrelid=relation AND attname=item.column_name
        AND NOT attisdropped AND atttypid='uuid'::regtype;
    IF attribute IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid=relation AND c.conname=item.constraint_name
        AND c.contype='f' AND c.convalidated
        AND c.conkey=ARRAY[attribute]::smallint[]
        AND c.confrelid=to_regclass(format('public.%I',item.referenced_table))
        AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute
          WHERE attrelid=c.confrelid AND attname='id' AND NOT attisdropped)]::smallint[]
    ) THEN
      RAISE EXCEPTION 'FK baseline mismatch: public.%.%', item.table_name, item.constraint_name;
    END IF;
    existing := to_regclass(format('public.%I',item.index_name));
    expected_definition := format('CREATE INDEX %I ON public.%I USING btree (%I)',
      item.index_name,item.table_name,item.column_name);
    IF existing IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM pg_index i
        WHERE i.indexrelid=existing AND i.indrelid=relation
          AND i.indisvalid AND i.indisready AND i.indislive
          AND pg_get_indexdef(i.indexrelid)=expected_definition
          AND obj_description(i.indexrelid,'pg_class')='IDEALAB shared FK indexes v1; reviewed candidate 2026-11-18') THEN
        RAISE EXCEPTION 'index name/definition/ownership collision: %', item.index_name;
      END IF;
    ELSE
      -- Reject stale telemetry rather than silently adding a redundant index.
      IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid
        JOIN pg_am am ON am.oid=ic.relam
        WHERE i.indrelid=relation AND i.indisvalid AND i.indisready
          AND i.indislive AND i.indpred IS NULL AND am.amname='btree'
          AND i.indkey[0]=attribute AND i.indnkeyatts>=1) THEN
        RAISE EXCEPTION 'covering index already exists for %.%; refresh telemetry',
          item.table_name,item.column_name;
      END IF;
      EXECUTE expected_definition;
      EXECUTE format('COMMENT ON INDEX public.%I IS %L',item.index_name,
        'IDEALAB shared FK indexes v1; reviewed candidate 2026-11-18');
    END IF;
  END LOOP;
END $migration$;
COMMIT;
