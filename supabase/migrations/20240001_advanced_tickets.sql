-- ============================================================
-- ATMMAM - Advanced Ticket System Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Update tickets table: add client_id link + assignment + internal fields
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS viewed_by_staff BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

-- 2. Add is_internal flag to ticket_messages (private comments)
ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'reply';
  -- message_type: 'reply' | 'internal_note' | 'status_change' | 'assignment'

-- 3. Ticket assignments history
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- 4. Ticket status history (workflow audit trail)
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- 5. Knowledge Base
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0
);

-- 6. Ticket documents/attachments
CREATE TABLE IF NOT EXISTS ticket_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_safe BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Agent collision detection (presence)
CREATE TABLE IF NOT EXISTS ticket_presence (
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ticket_id, user_id)
);

-- 8. Team skills/specializations for smart routing
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_tickets INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_is_internal ON ticket_messages(is_internal);
CREATE INDEX IF NOT EXISTS idx_ticket_presence_ticket_id ON ticket_presence(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category);

-- 10. RLS Policies
ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_presence ENABLE ROW LEVEL SECURITY;

-- Staff can see all
CREATE POLICY "staff_all_assignments" ON ticket_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','operator'))
  );

CREATE POLICY "staff_all_status_history" ON ticket_status_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','operator'))
  );

CREATE POLICY "kb_published_read" ON kb_articles
  FOR SELECT USING (is_published = TRUE OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','operator'))
  );

CREATE POLICY "staff_manage_kb" ON kb_articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

CREATE POLICY "ticket_docs_owner_or_staff" ON ticket_documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','operator'))
  );

CREATE POLICY "presence_own" ON ticket_presence
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "presence_staff_read" ON ticket_presence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','operator'))
  );

-- Internal messages: clients can only see non-internal
CREATE POLICY "messages_visibility" ON ticket_messages
  FOR SELECT USING (
    is_internal = FALSE OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','operator'))
  );
