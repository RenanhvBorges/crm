"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

// A supressão real só acontece aqui (submit do form), nunca no GET da
// página — scanners de segurança corporativos abrem todo link de um e-mail
// recebido, o que causaria descadastro em falso se o GET fosse destrutivo.
export async function confirmUnsubscribe(formData: FormData) {
  const recipientId = String(formData.get("rid") ?? "");
  const token = String(formData.get("t") ?? "");

  if (!recipientId || !token || !verifyUnsubscribeToken(recipientId, token)) {
    throw new Error("Link de descadastro inválido.");
  }

  const supabase = createAdminClient();
  const { data: recipient } = await supabase
    .from("email_campaign_recipients")
    .select("id, email, contact_id")
    .eq("id", recipientId)
    .maybeSingle();

  if (recipient) {
    await supabase
      .from("email_campaign_recipients")
      .update({ status: "suppressed", unsubscribed_at: new Date().toISOString() })
      .eq("id", recipient.id);

    await supabase.from("email_suppressions").upsert(
      {
        email: recipient.email.toLowerCase(),
        reason: "unsubscribed",
        contact_id: recipient.contact_id,
      },
      { onConflict: "email", ignoreDuplicates: true },
    );
  }

  redirect(
    `/unsubscribe?rid=${encodeURIComponent(recipientId)}&t=${encodeURIComponent(token)}&done=1`,
  );
}
