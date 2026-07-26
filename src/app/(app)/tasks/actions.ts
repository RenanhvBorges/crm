"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTask(formData: FormData) {
  const supabase = await createClient();

  const dueDateRaw = String(formData.get("due_date") ?? "");
  const contactId = String(formData.get("contact_id") ?? "") || null;
  const dealId = String(formData.get("deal_id") ?? "") || null;
  const assignedTo = String(formData.get("assigned_to") ?? "") || null;

  const { error } = await supabase.from("tasks").insert({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    due_date: dueDateRaw ? new Date(dueDateRaw).toISOString() : null,
    contact_id: contactId,
    deal_id: dealId,
    assigned_to: assignedTo,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (dealId) revalidatePath("/deals");
}

export async function toggleTask(taskId: string, done: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "pending",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
}

// Reatribuição inline (responsável / contato / negócio) a partir da lista de
// tarefas — três ações focadas, no mesmo espírito de toggleTask(taskId, done),
// compartilhando um helper só para não triplicar update/erro/revalidate.
async function updateTaskField(
  taskId: string,
  field: "assigned_to" | "contact_id" | "deal_id",
  value: string | null,
) {
  const supabase = await createClient();
  const update =
    field === "assigned_to"
      ? { assigned_to: value }
      : field === "contact_id"
        ? { contact_id: value }
        : { deal_id: value };
  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  if (field === "contact_id" && value) revalidatePath(`/contacts/${value}`);
  if (field === "deal_id" && value) revalidatePath("/deals");
}

export async function reassignTask(taskId: string, assignedTo: string | null) {
  return updateTaskField(taskId, "assigned_to", assignedTo);
}

export async function updateTaskContact(taskId: string, contactId: string | null) {
  return updateTaskField(taskId, "contact_id", contactId);
}

export async function updateTaskDeal(taskId: string, dealId: string | null) {
  return updateTaskField(taskId, "deal_id", dealId);
}
