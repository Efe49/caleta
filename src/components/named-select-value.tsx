"use client";

import { SelectValue } from "@/components/ui/select";

export function NamedSelectValue({
  placeholder,
  labelFor,
}: {
  placeholder: string;
  labelFor: (value: string) => string | null | undefined;
}) {
  return (
    <SelectValue placeholder={placeholder}>
      {(value) => {
        if (value == null || value === "") return placeholder;
        const label = labelFor(String(value))?.trim();
        return label || placeholder;
      }}
    </SelectValue>
  );
}
