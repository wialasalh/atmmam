import {
  LayoutDashboard, ClipboardList, PlusCircle, Edit3, Users,
  UserCog, MessageSquare, Send, Package, CalendarCheck,
  BarChart3, FileText, Shield, KeyRound, Settings, CalendarClock,
} from "lucide-react";

export type PermissionKey =
  | "view_dashboard"
  | "view_orders"
  | "create_orders"
  | "edit_orders"
  | "view_clients"
  | "edit_clients"
  | "view_tickets"
  | "reply_tickets"
  | "view_consultations"
  | "view_consultations_assigned"
  | "manage_services"
  | "manage_followups"
  | "view_reports"
  | "manage_content"
  | "manage_team"
  | "edit_permissions"
  | "settings_audit";

export type PermissionDef = {
  key: PermissionKey;
  label: string;
  icon: React.ComponentType<any>;
  group: "general" | "orders" | "clients" | "tickets" | "system";
  description: string;
};

export const ALL_PERMISSIONS: PermissionDef[] = [
  { key: "view_dashboard",    label: "لوحة التحكم",    icon: LayoutDashboard, group: "general",  description: "عرض لوحة التحكم الرئيسية والإحصائيات" },
  { key: "view_orders",       label: "عرض الطلبات",    icon: ClipboardList,  group: "orders",   description: "مشاهدة جميع الطلبات في النظام" },
  { key: "create_orders",     label: "إنشاء الطلبات",  icon: PlusCircle,     group: "orders",   description: "إضافة طلبات جديدة للعملاء" },
  { key: "edit_orders",       label: "تعديل الطلبات",  icon: Edit3,          group: "orders",   description: "تعديل الطلبات الموجودة وتغيير حالتها" },
  { key: "view_clients",      label: "عرض العملاء",    icon: Users,          group: "clients",  description: "مشاهدة قائمة العملاء وبياناتهم" },
  { key: "edit_clients",      label: "تعديل العملاء",  icon: UserCog,        group: "clients",  description: "إضافة وتعديل وحذف العملاء" },
  { key: "view_tickets",                label: "عرض التذاكر",              icon: MessageSquare,  group: "tickets",  description: "مشاهدة تذاكر الدعم" },
  { key: "reply_tickets",               label: "الرد على التذاكر",          icon: Send,           group: "tickets",  description: "الرد على تذاكر الدعم وإرسال رسائل" },
  { key: "view_consultations",          label: "الاستشارات — الكل",         icon: CalendarClock,  group: "tickets",  description: "مشاهدة جميع الاستشارات وإدارتها" },
  { key: "view_consultations_assigned", label: "الاستشارات — المحوّلة لي",  icon: CalendarClock,  group: "tickets",  description: "مشاهدة الاستشارات المحوّلة لهذا الموظف فقط" },
  { key: "manage_services",   label: "إدارة الخدمات",  icon: Package,        group: "system",   description: "إضافة وتعديل الخدمات والباقات" },
  { key: "manage_followups",  label: "إدارة المتابعات", icon: CalendarCheck, group: "system",   description: "إضافة ومتابعة المهام للعملاء" },
  { key: "view_reports",      label: "التقارير",        icon: BarChart3,     group: "system",   description: "عرض التقارير والتحليلات" },
  { key: "manage_content",    label: "إدارة المحتوى",   icon: FileText,      group: "system",   description: "إدارة المحتوى والصفحات التعريفية" },
  { key: "manage_team",       label: "إدارة الفريق",    icon: Shield,        group: "system",   description: "إضافة وإزالة أعضاء الفريق" },
  { key: "edit_permissions",  label: "تعديل الصلاحيات", icon: KeyRound,      group: "system",   description: "تعديل صلاحيات أعضاء الفريق" },
  { key: "settings_audit",    label: "الإعدادات",       icon: Settings,      group: "system",   description: "الإعدادات وسجل التدقيق" },
];

export const PERMISSION_GROUPS: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  general: { label: "عامة", icon: LayoutDashboard, color: "#0875dc" },
  orders:  { label: "الطلبات", icon: ClipboardList, color: "#d97706" },
  clients: { label: "العملاء", icon: Users, color: "#7c3aed" },
  tickets: { label: "الدعم", icon: MessageSquare, color: "#059669" },
  system:  { label: "النظام", icon: Settings, color: "#6b7280" },
};

export function defaultPermissions(staffRole: string): PermissionKey[] {
  const all = ALL_PERMISSIONS.map(p => p.key);
  switch (staffRole) {
    case "admin":
      return all;
    case "manager":
      return all.filter(k => !["manage_team", "edit_permissions"].includes(k));
    case "operator":
      return all.filter(k => [
        "view_dashboard", "view_orders", "create_orders", "edit_orders",
        "view_clients", "edit_clients", "view_tickets", "reply_tickets",
        "manage_followups", "view_consultations_assigned",
      ].includes(k));
    case "viewer":
      return ["view_dashboard", "view_reports"];
    default:
      return [];
  }
}

export function getPermissionDef(key: string): PermissionDef | undefined {
  return ALL_PERMISSIONS.find(p => p.key === key);
}
