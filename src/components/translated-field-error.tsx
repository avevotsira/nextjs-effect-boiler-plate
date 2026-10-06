"use client";

import { FieldError } from "@/components/ui/field";

import { useTranslations } from "next-intl";

/**
 * shadcn's `FieldError`, reading each message as a message key. The shared
 * Zod schemas carry keys such as `validation.required` instead of English
 * sentences, so a form's errors follow the chosen language.
 */
export function TranslatedFieldError({
  errors,
  ...props
}: React.ComponentProps<typeof FieldError>) {
  const t = useTranslations();
  return (
    <FieldError
      errors={errors?.map(
        (error) => error && { message: error.message && t(error.message) },
      )}
      {...props}
    />
  );
}
