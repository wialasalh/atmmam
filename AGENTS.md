# Agents Context File

## Goal
- Complete admin & client dashboards with service catalog, KB CMS, settings (profile/audit), and fix TS build errors.

## Constraints & Preferences
- Arabic-first RTL UI throughout the admin and client areas.
- Supabase backend with RLS; DB changes via Management API.
- Dev server: `http://localhost:3000` (Next.js 15.5.19, port 3000).
- Supabase project: `xirvdupifmwzqyyslpuf`
- GitHub repo: `wialasalh/atmmam` — opencode configured with GitHub MCP.
- Only lucide-react icon library installed.

## Progress
### Done
- **Client service catalog** (`/dashboard/services`) — accordion categories, search, request-form modal, stats cards. Backend `POST /api/client/service-requests` creates order + activity log.
- **KB admin CMS** (`/admin/kb`) — full CRUD (`GET/POST/PUT/DELETE /api/admin/kb`), search/filter/publish-toggle, editor modal. Header link added.
- **Admin settings** (`/admin/settings`) — rebuilt with 3 clean tabs: **الملف الشخصي** (avatar upload, name/phone editing, password change with cache-busting `?t=timestamp`), **سجل النشاطات** (audit log with Arabic action labels, colored dots, loading state), **الإشعارات** (placeholder). Team tab removed (team management at `/admin/team`).
- **Audit log translated** — all actions show Arabic labels; entity types also translated.
- **Audit log actor_id fixed** — all audit_log inserts now include `actor_id` so real user names appear instead of "النظام".
- **Avatar cache-busting** — `POST /api/account/avatar` appends `?t=<timestamp>`; header (`admin-ops-header.tsx`) displays avatar and refreshes on window focus.
- **Dashboard redirect removed** — `dashboard/layout.tsx` no longer auto-redirects admin/managers; admins can freely view the client dashboard.
- **Team page redesigned** (`/admin/team`) — KPI cards, role distribution bar chart, search + role filter, member table with avatar, side panel with avatar upload, invitations, skeleton loading, professional modals. CSS in `admin-team.css`.
- **Icons modernized** — replaced Pencil→SquarePen, Circle→BadgeCheck/BadgeX, Crown→Star, Users→UsersRound, Shield→ShieldCheck, etc.
- **UUID removed from team panel** — raw UUID no longer displayed.
- **Order status system expanded** — `OrderStatus` type includes ملغي and معلق; `statusTone` updated; `lib/domain/orders.ts` transitions updated; `lib/admin-orders-api.ts` statusMap fixed; CSS classes `.cancelled` and `.blocked` added.
- **Client management** (`/admin/clients`) — 5 stats cards, search, account-grouped table, detail panel with edit/activate/delete, inline edit form, password change button.
- **Client registration** (`/register`) — new client account creation handling.
- **Client password change** — API `PATCH /api/admin/clients/password` uses `admin.updateUserById`.
- **Team member password change** — API `PATCH /api/admin/team/password`. Button per member row.
- **Orders page redesigned** (`/admin/page.tsx`) — status pills with counts, compact table with ellipsis + alternating rows, no auto-selection, redesigned summary panel with inline styles, document upload, contact buttons, timeline. Grid switches between 1-column and 2-column.
- **Orders search improved** — wider field (260px), clearer placeholder "ابحث برقم الطلب، العميل، الخدمة...", clear (×) button, search includes phone + email fields.
- **Status transitions opened up** — all statuses can transition to all other statuses (فتح الكل).
- **"تعذر تحديث الحالة" fixed** — `changeAdminOrderStatus` bypasses RPC (`change_order_status` fails with `auth.uid()` via service client), uses `createClient` service role directly to update `orders`, insert `order_activity` and `audit_logs`.
- **Reason dialog for cancelled/blocked orders** — custom modal with textarea and colored confirm button (red for إلغاء, orange for تعليق) instead of `window.prompt`.
- **Status reason displayed in order summary** — red/orange section in admin order detail panel showing سبب الإلغاء/التعليق.
- **Status reason persisted** — when cancelling/blocking, reason saved to `orders.notes` field; `listAdminOrders` now selects `notes`; `AdminOrder` type has `statusReason` field.
- **Ticket creation API fixed** — `app/api/tickets/route.ts:194` changed `description:` to `body:` to match database column.
- **Client ticket detail fixed** (`/dashboard/tickets/[id]`) — type `TicketDetail` uses `body` instead of `description`.
- **Admin tickets fixed** (`/admin/tickets`) — `AdminTicket` type includes `body`; body displayed in detail panel.
- **Ticket extra fields cleaned** — removed "---\nمعلومات إضافية:\n" header; extra field values shown without label prefix (just values).
- **Ticket status history API** — new `GET /api/tickets/[id]/history` returns `ticket_status_history` with changer name, ordered desc.
- **Admin tickets overhaul** — activity timeline with colored status transitions + changer name + date; close dialog with required reason note (modal + `confirmStatusChange`); ticket body display with "وصف الطلب" header.
- **Admin tickets API fixed** — `GET /api/admin/tickets` now selects `body`, `user_id`, `attachments`, joins `profiles(full_name, email)` and `clients(...)` to show ticket content and facility data.
- **Client tickets timeline** — activity timeline displayed on ticket detail page showing status changes + reason + time.
- **TS error fixed** — `fStyle.chip` function extracted to standalone `chipStyle` in `app/admin/page.tsx`.

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- `changeAdminOrderStatus` uses `createClient` service role directly (bypasses RPC `auth.uid()` issue), logs activity + audit manually — safe because calling route already authenticates the user.
- `dashboard/layout.tsx` no longer auto-redirects admin/managers; admins can freely view the client dashboard.
- Team management lives at `/admin/team` (separate page), not inside settings.
- Order status transitions are now fully open (all statuses → all other statuses) per user request.
- Reason for cancelled/blocked orders saved to `orders.notes` column and displayed in admin summary panel.
- Orders page uses inline styles for layout instead of CSS classes to avoid conflicts.
- Avatar upload URL includes `?t=<timestamp>` cache-busting to force browser refresh.
- Audit log actions and entity types use Arabic labels via client-side mapping.
- Ticket extra fields submitted as plain values without labels (no "الموضوع الضريبي: " prefix).

## Next Steps
1. Add real-time sync (SSE/polling for orders + tickets).
2. Build client-side KB browse page.
3. Consider merge-client feature for shared accounts.
4. Add SLA timer display to ticket detail panels.

## Critical Context
- Only 1 admin profile: `ff0e6fa6-bbbd-45c8-b762-09c811df4d96` (role: admin, super_admin: true).
- `profiles` table has `avatar_url` column (text, nullable); `avatars` bucket exists and is public.
- Build compiles successfully (only pre-existing error in `app/admin/overview/page.tsx:31`); dev server at `http://localhost:3000`.
- `opencode.json` contains GitHub token — file is gitignored.
- `change_order_status` RPC no longer called from admin order status change — uses direct `service.from("orders").update({...})` instead.
- `createOrderSchema` is defined in `lib/validation/admin.ts` and supports all order fields.
- `listAuditLogs` in `lib/data/admin-audit.ts` joins `profiles` via `actor_id` FK to get actor name.
- Orders page layout grid: `grid-template-columns: selected ? "minmax(0,1fr) 315px" : "1fr"`.
- New statuses (ملغي, معلق) have CSS classes `.cancelled` (red) and `.blocked` (orange) in `globals.css`.
- Ticket creation uses `body` column (not `description`); ticket status history stored in `ticket_status_history` table.
- Business: "أتمم لخدمات الأعمال" — services include company formation, government platforms, licenses, accreditation, legal, HR, tax.

## Relevant Files
- `/Users/hasanm/Desktop/atmmam/app/admin/settings/page.tsx`: settings page with profile, audit, notifs tabs.
- `/Users/hasanm/Desktop/atmmam/app/admin/clients/page.tsx`: client management with grouping, CRUD, password change.
- `/Users/hasanm/Desktop/atmmam/app/api/account/avatar/route.ts`: avatar upload API (formData → storage → update profile).
- `/Users/hasanm/Desktop/atmmam/app/api/admin/clients/password/route.ts`: client password change API (admin.updateUserById).
- `/Users/hasanm/Desktop/atmmam/app/api/admin/team/route.ts`: team GET/POST/PATCH.
- `/Users/hasanm/Desktop/atmmam/app/api/admin/team/password/route.ts`: team member password change API.
- `/Users/hasanm/Desktop/atmmam/app/api/admin/clients/route.ts`: GET (profiles join), PATCH, DELETE.
- `/Users/hasanm/Desktop/atmmam/lib/data/admin-team.ts`: `changeTeamMemberPassword`, `createTeamMember`, `listAdminTeam`.
- `/Users/hasanm/Desktop/atmmam/lib/data/admin-orders.ts`: `changeAdminOrderStatus` (direct update + activity + audit).
- `/Users/hasanm/Desktop/atmmam/lib/domain/orders.ts`: transitions with cancelled/blocked.
- `/Users/hasanm/Desktop/atmmam/app/admin/page.tsx`: orders page — status pills, compact table, reason dialog modal.
- `/Users/hasanm/Desktop/atmmam/app/admin/tickets/page.tsx`: ticket management with activity timeline, close dialog, body display, facility panel.
- `/Users/hasanm/Desktop/atmmam/app/api/admin/tickets/route.ts`: GET with profiles + clients joins.
- `/Users/hasanm/Desktop/atmmam/app/api/tickets/[id]/history/route.ts`: **new** — returns `ticket_status_history` with profiles join.
- `/Users/hasanm/Desktop/atmmam/app/dashboard/tickets/[id]/page.tsx`: client ticket detail with body, activity timeline, chat.
- `/Users/hasanm/Desktop/atmmam/app/dashboard/tickets/new/page.tsx`: ticket creation form with clean extra fields (no labels).
- `/Users/hasanm/Desktop/atmmam/app/dashboard/orders/page.tsx`: client orders list.
- `/Users/hasanm/Desktop/atmmam/app/dashboard/page.tsx`: homepage with recent orders/tickets.
- `/Users/hasanm/Desktop/atmmam/app/admin/team/page.tsx + admin-team.css`: redesigned team management.
- `/Users/hasanm/Desktop/atmmam/app/globals.css`: contains `.cancelled`, `.blocked` CSS classes.
