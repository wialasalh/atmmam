import { describe, expect, it } from "vitest";
import { allowedOrderStatuses, canChangeOrderStatus, filterAdminOrders } from "./orders";
import { initialAdminOrders } from "../admin-orders";

describe("order workflow", () => {
  it("allows reopening a completed order", () => { expect(canChangeOrderStatus("مكتمل", "قيد التنفيذ")).toBe(true); expect(allowedOrderStatuses("مكتمل").length).toBe(6); });
  it("allows the normal execution path", () => { expect(canChangeOrderStatus("جديد", "قيد التنفيذ")).toBe(true); expect(canChangeOrderStatus("قيد التنفيذ", "مكتمل")).toBe(true); });
  it("searches and respects status", () => { expect(filterAdminOrders(initialAdminOrders, "الزكاة", "الكل").every((item) => item.agency.includes("الزكاة"))).toBe(true); expect(filterAdminOrders(initialAdminOrders, "", "مكتمل").every((item) => item.status === "مكتمل")).toBe(true); });
});
