import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/contact-form";

export default async function NewContactPage() {
  const supabase = await createClient();
  const [{ data: fieldDefinitions }, { data: fieldGroups }, { data: tagCatalog }] =
    await Promise.all([
      supabase
        .from("custom_field_definitions")
        .select("*")
        .eq("entity", "contact")
        .order("sort_order"),
      supabase
        .from("custom_field_groups")
        .select("*")
        .eq("entity", "contact")
        .order("sort_order"),
      supabase.from("tags").select("name, color").order("name"),
    ]);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl">Novo contato</h1>
      <ContactForm
        fieldDefinitions={fieldDefinitions ?? []}
        fieldGroups={fieldGroups ?? []}
        tagCatalog={tagCatalog ?? []}
      />
    </div>
  );
}
