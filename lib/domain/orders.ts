import type { AdminOrder, OrderStatus } from "@/lib/admin-orders";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  "جديد": ["بانتظار المستندات", "قيد التنفيذ"],
  "بانتظار المستندات": ["قيد التنفيذ"],
  "قيد التنفيذ": ["بانتظار المستندات", "مكتمل"],
  "مكتمل": [],
  "ملغي": [],
  "معلق": [],
};

export function allowedOrderStatuses(current: OrderStatus) { return [current, ...transitions[current]]; }
export function canChangeOrderStatus(current: OrderStatus, next: OrderStatus) { return current === next || transitions[current].includes(next); }
export function filterAdminOrders(orders: AdminOrder[], query: string, status: OrderStatus | "الكل") {
  const normalized = query.trim().toLocaleLowerCase("ar");
  return orders.filter((order) => {
    if (status !== "الكل" && order.status !== status) return false;
    if (!normalized) return true;
    return `${order.id} ${order.client} ${order.service} ${order.agency} ${order.assignee}`.toLocaleLowerCase("ar").includes(normalized);
  });
}
