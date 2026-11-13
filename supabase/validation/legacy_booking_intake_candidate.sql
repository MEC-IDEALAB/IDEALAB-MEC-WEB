-- Disposable rehearsal only. Apply transactionally after shared review.
LOCK TABLE public.tool_bookings IN ACCESS EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_policy p ON p.polrelid = c.oid
    WHERE c.oid = 'public.tool_bookings'::regclass AND c.relrowsecurity
      AND p.polname = 'bookings_insert_own' AND p.polpermissive
      AND p.polcmd = 'a' AND p.polroles = ARRAY[0::oid]
      AND pg_get_expr(p.polwithcheck, p.polrelid) = '(auth.uid() = user_id)'
  ) THEN
    RAISE EXCEPTION 'Legacy booking intake baseline changed; review again';
  END IF;
END $preflight$;

CREATE POLICY tool_bookings_pending_intake_only ON public.tool_bookings
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (
    auth.uid() = user_id AND status = 'pending'
    AND approved_by IS NULL AND approved_at IS NULL
    AND checkout_at IS NULL AND returned_at IS NULL
    AND return_reminder_sent IS FALSE
  );
