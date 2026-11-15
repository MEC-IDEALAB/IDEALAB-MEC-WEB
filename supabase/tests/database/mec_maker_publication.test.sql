-- Run after installing the canonical shared account contract in a scratch DB.
UPDATE public.users SET role = 'super_admin', is_active = true
  WHERE id = '00000000-0000-4000-8000-000000000005';
CREATE TABLE public.user_profiles (user_id uuid PRIMARY KEY, bio text NOT NULL);
INSERT INTO public.user_profiles VALUES ('00000000-0000-4000-8000-000000000005', 'legacy fixture');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);
DO $checks$
DECLARE
  initial jsonb := '{"display_name":"Fixture","bio":"Original","interests":["Robotics"],"skills":[],"links":[]}';
  edited jsonb := jsonb_set(initial, '{bio}', '"Edited privately"');
  first_link text;
  receipt jsonb;
BEGIN
  ASSERT NOT has_table_privilege(current_user, 'idealab_private.maker_profiles_v1', 'SELECT');
  ASSERT NOT has_table_privilege(current_user, 'idealab_private.maker_publication_history_v1', 'INSERT');
  ASSERT NOT has_function_privilege('anon', 'public.mutate_maker_profile_v1(text,text,jsonb)', 'EXECUTE');
  ASSERT public.mutate_maker_profile_v1('publish', '0', initial)->>'status' = 'invalid';
  ASSERT public.mutate_maker_profile_v1('save_draft', '0', initial || '{"visibility":"public"}')->>'status' = 'invalid';
  ASSERT public.mutate_maker_profile_v1('save_draft', '0', initial || '{"phone":"+910000000000"}')->>'status' = 'invalid';
  ASSERT public.mutate_maker_profile_v1('save_draft', '0', jsonb_set(initial, '{bio}', '""')) =
    '{"status":"saved","revision":"1","share_id":null}';
  ASSERT public.mutate_maker_profile_v1('publish', '1')->>'status' = 'invalid';
  ASSERT public.mutate_maker_profile_v1('save_draft', '1', initial) =
    '{"status":"saved","revision":"2","share_id":null}';
  receipt := public.mutate_maker_profile_v1('publish', '2');
  first_link := receipt->>'share_id';
  ASSERT receipt->>'revision' = '3' AND first_link IS NOT NULL;
  ASSERT first_link <> auth.uid()::text;
  ASSERT public.mutate_maker_profile_v1('save_draft', '3', edited)->>'share_id' = first_link;
  ASSERT public.mutate_maker_profile_v1('publish', '3')->>'status' = 'conflict';
  PERFORM set_config('maker_fixture.old_link', first_link, true);
END;
$checks$;
RESET ROLE;

DO $snapshot$
BEGIN
  ASSERT (SELECT draft->>'bio' = 'Edited privately' AND published->>'bio' = 'Original'
    FROM idealab_private.maker_profiles_v1), 'private edit leaves previous publication intact';
  ASSERT (SELECT count(*) = 1 FROM idealab_private.maker_publication_history_v1);
  ASSERT (SELECT bio = 'legacy fixture' FROM public.user_profiles);
END;
$snapshot$;

SET LOCAL ROLE authenticated;
DO $withdraw$
DECLARE
  receipt jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  ASSERT public.mutate_maker_profile_v1('withdraw', '4')->>'status' = 'unauthorized';
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);
  ASSERT public.mutate_maker_profile_v1('withdraw', '4') =
    '{"status":"saved","revision":"5","share_id":null}';
  ASSERT public.mutate_maker_profile_v1('withdraw', '4')->>'status' = 'conflict';
  receipt := public.mutate_maker_profile_v1('publish', '5');
  ASSERT receipt->>'revision' = '6' AND receipt->>'share_id' <> current_setting('maker_fixture.old_link');
END;
$withdraw$;
RESET ROLE;

DO $audit$
BEGIN
  ASSERT (SELECT array_agg(operation ORDER BY revision) = ARRAY['publish', 'withdraw', 'publish']
    FROM idealab_private.maker_publication_history_v1), 'publication transitions retain audit history';
  ASSERT (SELECT draft->>'bio' = 'Edited privately' AND published->>'bio' = 'Edited privately'
    FROM idealab_private.maker_profiles_v1);
END;
$audit$;
