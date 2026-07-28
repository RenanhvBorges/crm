import { z } from "zod";
import { EVENT_TYPES } from "@/lib/automations/triggers";

// Schemas de corpo da API v1 (zod v4). POST usa o schema completo; PATCH usa
// a variante .partial() exportada ao lado.

export const contactCreateSchema = z.object({
  name: z.string().min(1, "O campo 'name' é obrigatório."),
  email: z.email("E-mail inválido.").nullish(),
  phone: z.string().nullish(),
  company: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});
export const contactUpdateSchema = contactCreateSchema.partial();

export const tagCreateSchema = z.object({
  name: z.string().min(1, "O campo 'name' é obrigatório."),
  color: z.string().optional(),
});
export const tagUpdateSchema = tagCreateSchema.partial();

export const contactTagsSchema = z.object({
  tags: z.array(z.string().min(1)).min(1, "Informe ao menos uma tag."),
});

export const listCreateSchema = z.object({
  name: z.string().min(1, "O campo 'name' é obrigatório."),
  description: z.string().nullish(),
  sort_order: z.number().int().optional(),
});
export const listUpdateSchema = listCreateSchema.partial();

export const listMembersSchema = z.object({
  contact_ids: z.array(z.uuid()).min(1, "Informe ao menos um contato."),
});

export const customFieldCreateSchema = z.object({
  entity: z.enum(["contact", "deal"]),
  key: z.string().min(1),
  label: z.string().min(1),
  field_type: z.string().min(1),
  is_required: z.boolean().optional(),
  options: z.unknown().nullish(),
  group_id: z.uuid().nullish(),
  sort_order: z.number().int().optional(),
});
// `entity` é omitido: trocar a entidade de um campo existente órfanaria os
// valores já gravados em contacts/deals.custom_fields.
export const customFieldUpdateSchema = customFieldCreateSchema.omit({ entity: true }).partial();

export const automationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
  allow_reentry: z.boolean().optional(),
});

export const dealCreateSchema = z.object({
  title: z.string().min(1, "O campo 'title' é obrigatório."),
  pipeline_id: z.uuid(),
  stage_id: z.uuid(),
  value: z.number().min(0).optional(),
  contact_id: z.uuid().nullish(),
  status: z.enum(["open", "won", "lost"]).optional(),
  expected_close_date: z.string().nullish(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});
export const dealUpdateSchema = dealCreateSchema.partial();

export const taskCreateSchema = z.object({
  title: z.string().min(1, "O campo 'title' é obrigatório."),
  description: z.string().nullish(),
  status: z.enum(["pending", "done"]).optional(),
  due_date: z.string().nullish(),
  contact_id: z.uuid().nullish(),
  deal_id: z.uuid().nullish(),
  assigned_to: z.uuid().nullish(),
});
export const taskUpdateSchema = taskCreateSchema.partial();

export const enrollSchema = z
  .object({
    contact_id: z.uuid().optional(),
    email: z.email().optional(),
  })
  .refine((v) => v.contact_id || v.email, {
    message: "Informe 'contact_id' ou 'email'.",
  });

// "*" assina todos os eventos, inclusive os que forem criados depois.
const VALID_EVENTS = new Set([...EVENT_TYPES.map((e) => e.value), "*"]);

export const webhookCreateSchema = z.object({
  name: z.string().min(1, "O campo 'name' é obrigatório."),
  url: z.url("URL inválida."),
  events: z
    .array(z.string())
    .min(1, "Informe ao menos um evento.")
    .refine((events) => events.every((e) => VALID_EVENTS.has(e)), {
      message: `Eventos válidos: ${[...VALID_EVENTS].join(", ")}.`,
    }),
  is_active: z.boolean().optional(),
});
export const webhookUpdateSchema = webhookCreateSchema.partial();
