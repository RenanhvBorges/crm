import { withApiAuth, throwOnDbError, deleted } from "@/lib/api/handler";
import { kickAutomationProcessor } from "@/lib/automations/kick";

type Params = { id: string; contactId: string };

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { error } = await admin
    .from("contact_list_members")
    .delete()
    .eq("list_id", params.id)
    .eq("contact_id", params.contactId);
  throwOnDbError(error);

  kickAutomationProcessor();
  return deleted();
});
