import type { AdminOrder, OrderStatus } from "@/lib/admin-orders";

const allStatuses: OrderStatus[] = ["جديد", "بانتظار المستندات", "قيد التنفيذ", "مكتمل", "ملغي", "معلق"];

const transitions: Record<OrderStatus, OrderStatus[]> = {
  "جديد": allStatuses.filter((s) => s !== "جديد"),
  "بانتظار المستندات": allStatuses.filter((s) => s !== "بانتظار المستندات"),
  "قيد التنفيذ": allStatuses.filter((s) => s !== "قيد التنفيذ"),
  "مكتمل": allStatuses.filter((s) => s !== "مكتمل"),
  "ملغي": allStatuses.filter((s) => s !== "ملغي"),
  "معلق": allStatuses.filter((s) => s !== "معلق"),
};

export function allowedOrderStatuses(current: OrderStatus) { return [current, ...transitions[current]]; }
export function canChangeOrderStatus(current: OrderStatus, next: OrderStatus) { return current === next || transitions[current].includes(next); }
export function filterAdminOrders(orders: AdminOrder[], query: string, status: OrderStatus | "الكل") {
  const normalized = query.trim().toLocaleLowerCase("ar");
  return orders.filter((order) => {
    if (status !== "الكل" && order.status !== status) return false;
    if (!normalized) return true;
    return `${order.id} ${order.client} ${order.service} ${order.agency} ${order.assignee} ${order.phone} ${order.email}`.toLocaleLowerCase("ar").includes(normalized);
  });
}
