"use client";

import { ErrorMessage } from "@/components/error-message";
import { ApiClientError } from "@/lib/api/client";

import { useTranslations } from "next-intl";

/**
 * A failed request, in the user's language. The server's message is
 * English, for logs; the client shows its own text for the error's `code`,
 * falling back to a generic one for codes it does not know.
 */
export function ApiErrorMessage({
  error,
  ...props
}: Omit<React.ComponentProps<typeof ErrorMessage>, "children"> & {
  error: Error | null;
}) {
  const t = useTranslations("api_error");
  if (!error) return null;
  const code =
    error instanceof ApiClientError ? error.apiError.code : "UNKNOWN";
  return (
    <ErrorMessage {...props}>
      {t.has(code) ? t(code) : t("UNKNOWN")}
    </ErrorMessage>
  );
}
