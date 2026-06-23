import { z } from "zod";

export const orderStatusSchema = z.enum(["new", "waiting_documents", "in_progress", "completed", "cancelled", "blocked"]);
export const orderPrioritySchema = z.enum(["normal", "high", "urgent"]);

export const createClientSchema = z.object({
  clientType: z.enum(["company", "person"]),
  name: z.string().trim().min(2).max(160),
  commercialNumber: z.string().trim().max(20).optional(),
  nationalId: z.string().trim().max(20).optional(),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().regex(/^(?:966|0)?5\d{8}$/),
  email: z.email().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

export const createOrderSchema = z.object({
  clientId: z.uuid(),
  serviceId: z.uuid(),
  agencyId: z.uuid().optional(),
  priority: orderPrioritySchema.default("normal"),
  assigneeId: z.uuid().optional(),
  dueAt: z.iso.datetime().optional(),
  nextActionText: z.string().trim().min(3).max(500).optional(),
  nextActionAt: z.iso.datetime().optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.uuid(),
  status: orderStatusSchema,
  reason: z.string().trim().max(1000).optional(),
}).superRefine((value, context) => {
  if (["cancelled", "blocked"].includes(value.status) && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "السبب مطلوب لهذه الحالة" });
  }
});

export const updateProfileRoleSchema = z.object({
  profileId: z.uuid(),
  role: z.enum(["admin", "manager", "operator", "viewer"]),
  active: z.boolean().optional(),
});

export const orderDocumentMetadataSchema = z.object({
  orderId: z.uuid(),
  name: z.string().trim().min(2).max(180),
});

export const serviceInputSchema = z.object({
  name: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(100),
  agencyId: z.uuid(),
  defaultDurationDays: z.coerce.number().int().min(1).max(365),
  requiredDocuments: z.array(z.string().trim().min(2).max(180)).max(30).default([]),
  active: z.boolean().default(true),
});

export const updateServiceSchema = serviceInputSchema.partial().extend({ serviceId: z.uuid() });

export const createTaskSchema = z.object({
  orderId: z.uuid(),
  title: z.string().trim().min(3).max(300),
  assigneeId: z.uuid().optional(),
  dueAt: z.iso.datetime(),
});

export const updateTaskSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(["open", "completed", "cancelled"]),
});
