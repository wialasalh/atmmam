import { describe, expect, it } from "vitest";
import { createClientSchema, createTaskSchema, serviceInputSchema, updateOrderStatusSchema, updateProfileRoleSchema } from "./admin";

describe("admin validation", () => {
  it("accepts valid client data", () => { expect(createClientSchema.safeParse({ clientType: "company", name: "شركة اختبار", phone: "966512345678", email: "ops@example.com" }).success).toBe(true); });
  it("rejects invalid contact data", () => { expect(createClientSchema.safeParse({ clientType: "company", name: "أ", phone: "123", email: "bad" }).success).toBe(false); });
  it("requires a reason for blocked orders", () => { const base = { orderId: "550e8400-e29b-41d4-a716-446655440000" }; expect(updateOrderStatusSchema.safeParse({ ...base, status: "blocked" }).success).toBe(false); expect(updateOrderStatusSchema.safeParse({ ...base, status: "blocked", reason: "تعذر استلام المستند" }).success).toBe(true); });
  it("only accepts known team roles", () => { const profileId = "550e8400-e29b-41d4-a716-446655440000"; expect(updateProfileRoleSchema.safeParse({ profileId, role: "manager" }).success).toBe(true); expect(updateProfileRoleSchema.safeParse({ profileId, role: "owner" }).success).toBe(false); });
  it("validates service duration and agency", () => { const base={name:"إصدار رخصة",category:"التراخيص",agencyId:"550e8400-e29b-41d4-a716-446655440000",requiredDocuments:[]}; expect(serviceInputSchema.safeParse({...base,defaultDurationDays:7}).success).toBe(true); expect(serviceInputSchema.safeParse({...base,defaultDurationDays:0}).success).toBe(false); });
  it("requires a valid order and due date for follow-ups", () => { expect(createTaskSchema.safeParse({orderId:"550e8400-e29b-41d4-a716-446655440000",title:"مراجعة المستندات",dueAt:"2026-06-23T10:00:00.000Z"}).success).toBe(true); expect(createTaskSchema.safeParse({orderId:"bad",title:"م",dueAt:"tomorrow"}).success).toBe(false); });
});
