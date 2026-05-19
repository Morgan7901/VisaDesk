-- Notifications table — one row per in-app notification per recipient.
-- Written by the server (service role via notify() helper); read/updated
-- by the authenticated user via RLS-scoped browser client.

CREATE TABLE notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  firm_id    uuid        NOT NULL REFERENCES firms(id)     ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'general',
  title      text        NOT NULL,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON notifications (profile_id, created_at DESC);

-- Enable realtime so NotificationBell receives live INSERTs
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- FULL identity so UPDATE/DELETE payloads include the full row
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "users can select their own notifications"
  ON notifications FOR SELECT
  USING (profile_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "users can update their own notifications"
  ON notifications FOR UPDATE
  USING (profile_id = auth.uid());

-- Service role bypasses RLS; explicit grant keeps the intent clear
GRANT ALL ON notifications TO service_role;
