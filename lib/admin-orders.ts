export type OrderStatus = "جديد" | "بانتظار المستندات" | "قيد التنفيذ" | "مكتمل" | "ملغي" | "معلق";

export type AdminOrder = {
  databaseId?: string;
  clientId?: string;
  serviceId?: string;
  agencyId?: string;
  assigneeId?: string;
  id: string;
  client: string;
  service: string;
  agency: string;
  agencyType: "commerce" | "zatca" | "ip";
  status: OrderStatus;
  assignee: string;
  updatedAt: string;
  phone: string;
  email: string;
  nextAction: string;
  nextActionAt: string;
  statusReason?: string;
  archivedAt?: string | null;
};

export const statusTone: Record<OrderStatus, string> = {
  "جديد": "new",
  "بانتظار المستندات": "waiting",
  "قيد التنفيذ": "active",
  "مكتمل": "done",
  "ملغي": "done",
  "معلق": "waiting",
};

export const initialAdminOrders: AdminOrder[] = [
  { id: "REQ-2025-0042", client: "شركة رفد التقنية", service: "تأسيس شركة ذات مسؤولية محدودة", agency: "وزارة التجارة", agencyType: "commerce", status: "قيد التنفيذ", assignee: "مدير النظام", updatedAt: "اليوم، 10:30 ص", phone: "966500000001", email: "client@example.com", nextAction: "مراجعة عقد التأسيس وإرساله للعميل للتوقيع", nextActionAt: "غدًا، 11:00 ص" },
  { id: "REQ-2025-0041", client: "مؤسسة أفق الإبداع", service: "تسجيل علامة تجارية", agency: "الهيئة السعودية للملكية الفكرية", agencyType: "ip", status: "بانتظار المستندات", assignee: "مدير النظام", updatedAt: "اليوم، 09:15 ص", phone: "966500000002", email: "ofok@example.com", nextAction: "طلب نسخة الهوية وملف العلامة من العميل", nextActionAt: "اليوم، 01:00 م" },
  { id: "REQ-2025-0040", client: "شركة نبض الحلول", service: "تعديل عقد شركة", agency: "وزارة التجارة", agencyType: "commerce", status: "جديد", assignee: "مدير النظام", updatedAt: "اليوم، 08:45 ص", phone: "966500000003", email: "nabd@example.com", nextAction: "مراجعة بيانات الشركاء ونطاق التعديل", nextActionAt: "اليوم، 02:30 م" },
  { id: "REQ-2025-0039", client: "شركة مسار النمو", service: "تأسيس شركة مساهمة مبسطة", agency: "وزارة التجارة", agencyType: "commerce", status: "قيد التنفيذ", assignee: "مدير النظام", updatedAt: "أمس، 04:20 م", phone: "966500000004", email: "masar@example.com", nextAction: "اعتماد مسودة عقد التأسيس", nextActionAt: "غدًا، 09:30 ص" },
  { id: "REQ-2025-0038", client: "مؤسسة الابتكار الرقمي", service: "ضريبة القيمة المضافة", agency: "هيئة الزكاة والضريبة والجمارك", agencyType: "zatca", status: "بانتظار المستندات", assignee: "مدير النظام", updatedAt: "أمس، 02:10 م", phone: "966500000005", email: "digital@example.com", nextAction: "استلام كشف الإيرادات", nextActionAt: "25 يونيو، 10:00 ص" },
  { id: "REQ-2025-0037", client: "شركة التميز للاستشارات", service: "تسجيل علامة تجارية", agency: "الهيئة السعودية للملكية الفكرية", agencyType: "ip", status: "مكتمل", assignee: "مدير النظام", updatedAt: "أمس، 11:05 ص", phone: "966500000006", email: "tamayoz@example.com", nextAction: "لا يوجد إجراء حالي", nextActionAt: "—" },
  { id: "REQ-2025-0036", client: "مؤسسة رؤية الأعمال", service: "إصدار سجل تجاري", agency: "وزارة التجارة", agencyType: "commerce", status: "مكتمل", assignee: "مدير النظام", updatedAt: "18 مايو، 04:40 م", phone: "966500000007", email: "roya@example.com", nextAction: "لا يوجد إجراء حالي", nextActionAt: "—" },
  { id: "REQ-2025-0035", client: "شركة التقنيات المتقدمة", service: "تعديل عقد شركة", agency: "وزارة التجارة", agencyType: "commerce", status: "قيد التنفيذ", assignee: "مدير النظام", updatedAt: "18 مايو، 01:30 م", phone: "966500000008", email: "advanced@example.com", nextAction: "رفع قرار الشركاء", nextActionAt: "26 يونيو، 12:00 م" },
  { id: "REQ-2025-0034", client: "مؤسسة حلول المستقبل", service: "ضريبة القيمة المضافة", agency: "هيئة الزكاة والضريبة والجمارك", agencyType: "zatca", status: "جديد", assignee: "مدير النظام", updatedAt: "18 مايو، 10:20 ص", phone: "966500000009", email: "future@example.com", nextAction: "التواصل الأولي مع العميل", nextActionAt: "اليوم، 04:00 م" },
  { id: "REQ-2025-0033", client: "شركة البناء الذكي", service: "تأسيس شركة ذات مسؤولية محدودة", agency: "وزارة التجارة", agencyType: "commerce", status: "قيد التنفيذ", assignee: "مدير النظام", updatedAt: "17 مايو، 03:50 م", phone: "966500000010", email: "smart@example.com", nextAction: "متابعة موافقة الاسم التجاري", nextActionAt: "27 يونيو، 09:00 ص" },
];

const STORAGE_KEY = "atmmam:admin-orders:v1";

export function readAdminOrders() {
  if (typeof window === "undefined") return initialAdminOrders;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as AdminOrder[] : initialAdminOrders;
  } catch {
    return initialAdminOrders;
  }
}

export function writeAdminOrders(orders: AdminOrder[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // The database layer will replace this preview persistence.
  }
}
