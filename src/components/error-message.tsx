import { cn } from "@/lib/utils";

import { AlertCircleIcon } from "lucide-react";

/**
 * The one way this app shows a failure. Every surface used to hand-roll a red
 * box, so they drifted in colour, size and whether they announced themselves
 * at all — and a user with low digital literacy had to work out that a pale
 * pink line was the reason nothing happened.
 *
 * `role="alert"` so a screen reader announces it the moment it appears, an
 * icon so it reads as an error without relying on colour (WCAG 1.4.1), and
 * enough contrast and size to be legible next to the field it belongs to.
 *
 * Renders nothing when there is nothing to say, so callers can pass a possibly
 * absent error straight in.
 */
export function ErrorMessage({
  children,
  title,
  className,
  ...props
}: React.ComponentProps<"div"> & { title?: string }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      data-slot="error-message"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800",
        className,
      )}
      {...props}
    >
      <AlertCircleIcon
        aria-hidden
        className="mt-0.5 size-4.5 shrink-0 text-red-600"
      />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        <div className="text-sm wrap-break-word">{children}</div>
      </div>
    </div>
  );
}
