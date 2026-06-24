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
};

export const statusTone: Record<OrderStatus, string> = {
  "جديد": "new",
  "بانتظار المستندات": "waiting",
  "قيد التنفيذ": "active",
  "مكتمل": "done",
  "ملغي": "cancelled",
  "معلق": "blocked",
};

export const initialAdminOrders: AdminOrder[] = [];

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
