-- Synthetic shared event shape; never import into a shared database.
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  description text, event_type text CHECK (event_type IN ('workshop','hackathon','talk','competition','open_lab','other')),
  event_date timestamptz NOT NULL, end_date timestamptz, venue text,
  capacity integer, rsvp_count integer, image_url text,
  created_by uuid REFERENCES public.users(id),
  status text CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.events TO anon, authenticated;
CREATE POLICY fixture_published_events ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id), qr_ticket_data text UNIQUE,
  checked_in_at timestamptz, created_at timestamptz DEFAULT now(), UNIQUE(event_id,user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rsvps FROM PUBLIC, anon, authenticated, service_role;
INSERT INTO idealab_private.staff_scopes_v1(id,kind,resource_key)
VALUES ('20000000-0000-0000-0000-000000000001','events','synthetic-events'),
 ('20000000-0000-0000-0000-000000000002','machine','synthetic-machine');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SELECT public.set_staff_scope_head_v1('20000000-0000-0000-0000-000000000001',1,
 '00000000-0000-0000-0000-000000000002','assign','Disposable Event Head fixture',gen_random_uuid(),
 '00000000-0000-0000-0000-000000000001');
SELECT public.set_staff_scope_head_v1('20000000-0000-0000-0000-000000000002',1,
 '00000000-0000-0000-0000-000000000002','assign','Disposable Machine Head fixture',gen_random_uuid(),
 '00000000-0000-0000-0000-000000000001');
RESET ROLE;
