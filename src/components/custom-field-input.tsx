"use client";

import type {
  CustomFieldDefinition,
  CustomFieldValues,
} from "@/lib/custom-fields";

// Renderiza o input adequado a um campo personalizado, agnóstico de entidade
// (usado tanto por contatos quanto por negócios).
export function CustomFieldInput({
  definition,
  value,
  onChange,
}: {
  definition: CustomFieldDefinition;
  value: CustomFieldValues[string];
  onChange: (value: CustomFieldValues[string]) => void;
}) {
  const baseClass =
    "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";
  const options = (definition.options as { value: string; label: string }[] | null) ?? [];

  switch (definition.field_type) {
    case "textarea":
      return (
        <textarea
          className={baseClass}
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className={baseClass}
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "boolean":
      return (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "select":
      return (
        <select
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <select
          multiple
          className={baseClass}
          value={selected}
          onChange={(e) =>
            onChange(Array.from(e.target.selectedOptions, (o) => o.value))
          }
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    case "url":
      return (
        <input
          type="url"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "email":
      return (
        <input
          type="email"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "phone":
      return (
        <input
          type="tel"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          type="text"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
