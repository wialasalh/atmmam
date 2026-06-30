-- ── Notifications System ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT,                             -- 'admin' = visible to all staff roles
  type        TEXT        NOT NULL,             -- ticket_reply | ticket_new | ticket_client_message | order_status | rating
  title       TEXT        NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS notif_user_idx ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_role_idx ON public.notifications(target_role, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin/staff?
CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin','manager','operator','viewer')
  );
$$;

-- Staff can read admin-targeted notifs + their own personal notifs
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (
  user_id = auth.uid()
  OR (target_role = 'admin' AND public.is_admin_staff())
);

-- Users can mark their own (or admin-targeted if staff) as read
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (target_role = 'admin' AND public.is_admin_staff())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (target_role = 'admin' AND public.is_admin_staff())
  );

-- ── Trigger: new ticket created → notify all admins ───────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_new_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_service_name TEXT;
BEGIN
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
  INSERT INTO public.notifications(target_role, type, title, body, link)
  VALUES (
    'admin', 'ticket_new',
    'تذكرة جديدة',
    COALESCE(NEW.title, 'تذكرة') || CASE WHEN v_service_name IS NOT NULL THEN ' — ' || v_service_name ELSE '' END,
    '/admin/tickets?id=' || NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_ticket ON public.tickets;
CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_new_ticket();

-- ── Trigger: ticket message inserted ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_ticket_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ticket_user_id UUID;
  v_ticket_title   TEXT;
  v_sender_role    TEXT;
BEGIN
  -- Skip internal notes and rating messages (ratings have their own trigger)
  IF NEW.is_internal OR NEW.message_type = 'rating' THEN RETURN NEW; END IF;

  SELECT t.user_id, t.title INTO v_ticket_user_id, v_ticket_title
  FROM public.tickets t WHERE t.id = NEW.ticket_id;

  SELECT role INTO v_sender_role FROM public.profiles WHERE user_id = NEW.user_id;

  -- Staff replied → notify the ticket's client
  IF v_sender_role IN ('admin','manager','operator','viewer') AND v_ticket_user_id <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (
      v_ticket_user_id, 'ticket_reply',
      'رد جديد على تذكرتك',
      v_ticket_title,
      '/dashboard/tickets/' || NEW.ticket_id
    );
  END IF;

  -- Client sent message → notify all admins
  IF v_sender_role IS NULL OR v_sender_role NOT IN ('admin','manager','operator','viewer') THEN
    INSERT INTO public.notifications(target_role, type, title, body, link)
    VALUES (
      'admin', 'ticket_client_message',
      'رسالة جديدة من عميل',
      v_ticket_title,
      '/admin/tickets?id=' || NEW.ticket_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ticket_message ON public.ticket_messages;
CREATE TRIGGER trg_notify_ticket_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_ticket_message();

-- ── Trigger: rating submitted → notify rated staff ────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_meta     JSONB;
  v_staff_id UUID;
  v_rating   INT;
  v_comment  TEXT;
BEGIN
  IF NEW.message_type <> 'rating' THEN RETURN NEW; END IF;
  BEGIN
    v_meta     := NEW.body::JSONB;
    v_staff_id := (v_meta->>'staff_id')::UUID;
    v_rating   := COALESCE((v_meta->>'rating')::INT, 0);
    v_comment  := COALESCE(v_meta->>'comment', '');
    IF v_staff_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
      VALUES (
        v_staff_id, 'rating',
        'تقييم جديد ' || REPEAT('★', v_rating) || REPEAT('☆', GREATEST(0, 5 - v_rating)),
        CASE WHEN v_comment <> '' THEN v_comment ELSE 'بدون تعليق' END,
        '/admin/tickets?id=' || NEW.ticket_id,
        v_meta
      );
    END IF;
    -- Also notify all admins about the rating
    INSERT INTO public.notifications(target_role, type, title, body, link, metadata)
    VALUES (
      'admin', 'rating',
      'تقييم جديد ' || REPEAT('★', v_rating) || REPEAT('☆', GREATEST(0, 5 - v_rating)),
      CASE WHEN v_comment <> '' THEN v_comment ELSE 'بدون تعليق' END,
      '/admin/tickets?id=' || NEW.ticket_id,
      v_meta
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rating ON public.ticket_messages;
CREATE TRIGGER trg_notify_rating
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_rating();

-- ── Trigger: order status change → notify client ──────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_order_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_client_user_id UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  SELECT c.user_id INTO v_client_user_id
  FROM public.clients c WHERE c.id = NEW.client_id;

  IF v_client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (
      v_client_user_id, 'order_status',
      'تحديث حالة طلبك',
      'طلب ' || NEW.reference_no || ' — ' || NEW.status,
      '/dashboard/orders/' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_order_status();

-- Enable realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
