
-- 1. users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  college_roll TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student','core_team','op_head','faculty')),
  club_id UUID,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  reputation_score INTEGER DEFAULT 100,
  qr_code_data TEXT UNIQUE,
  fcm_token TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. clubs
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from users → clubs
ALTER TABLE public.users
  ADD CONSTRAINT fk_users_club
  FOREIGN KEY (club_id) REFERENCES public.clubs(id);

-- 3. tools
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('3d_printer','laser','electronics','woodwork','fabrication','other')),
  description TEXT,
  image_url TEXT,
  sop_url TEXT,
  total_qty INTEGER NOT NULL DEFAULT 1,
  available_qty INTEGER NOT NULL DEFAULT 1,
  health_status TEXT DEFAULT 'available'
    CHECK (health_status IN ('available','in_use','maintenance','retired')),
  last_maintained TIMESTAMPTZ,
  qr_code_data TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. tool_bookings
CREATE TABLE public.tool_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES public.tools(id),
  user_id UUID REFERENCES public.users(id),
  project_id UUID,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','active','returned','overdue','cancelled')),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  checkout_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  return_reminder_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. lab_sessions
CREATE TABLE public.lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  checkin_time TIMESTAMPTZ DEFAULT NOW(),
  checkout_time TIMESTAMPTZ,
  purpose TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'workshop'
    CHECK (event_type IN ('workshop','hackathon','talk','competition','open_lab','other')),
  club_id UUID REFERENCES public.clubs(id),
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  venue TEXT,
  capacity INTEGER,
  rsvp_count INTEGER DEFAULT 0,
  image_url TEXT,
  created_by UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. rsvps
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  qr_ticket_data TEXT UNIQUE,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 8. projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  club_id UUID REFERENCES public.clubs(id),
  stage TEXT DEFAULT 'ideation'
    CHECK (stage IN ('ideation','in_progress','completed','showcase')),
  created_by UUID REFERENCES public.users(id),
  visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public','club','private')),
  showcase_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from tool_bookings.project_id → projects
ALTER TABLE public.tool_bookings
  ADD CONSTRAINT fk_bookings_project
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- 9. project_members
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  role TEXT DEFAULT 'member'
    CHECK (role IN ('admin','lead','member','mentor')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 10. notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. knowledge_articles
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  author_id UUID REFERENCES public.users(id),
  upvotes INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tool_bookings_user ON public.tool_bookings(user_id);
CREATE INDEX idx_tool_bookings_status ON public.tool_bookings(status);
CREATE INDEX idx_lab_sessions_user ON public.lab_sessions(user_id);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_rsvps_event ON public.rsvps(event_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
