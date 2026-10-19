"use client";

import { useEffect, useRef } from "react";

// Checkbox de seleção com suporte ao estado "indeterminado" (seleção parcial),
// que só existe como propriedade do DOM, não como atributo.
export function SelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className={`h-4 w-4 shrink-0 cursor-pointer accent-oxford-blue ${className}`}
    />
  );
}
