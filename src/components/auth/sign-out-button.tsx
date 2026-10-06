"use client";

import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { isErr } from "@justmiracle/result";
import { useMutation } from "@tanstack/react-query";
import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Ends the session, then sends the browser to `/`, which lands on the login
 * page. A full navigation, so no stale client cache survives. If the sign-in
 * provider keeps its own session (an SSO), send the browser to its logout
 * URL here instead, or "Sign in" lets the person straight back in.
 */
export function SignOutButton({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const t = useTranslations("auth");
  const signOut = useMutation({
    mutationFn: async () => {
      const result = await apiFetch<null>("/api/auth/sessions/current", {
        method: "DELETE",
      });
      if (isErr(result)) throw new ApiClientError(result.error);
    },
    onSuccess: () => window.location.assign("/"),
  });

  return (
    <Button
      variant="outline"
      data-slot="sign-out-button"
      className={cn("gap-2", className)}
      disabled={signOut.isPending}
      // Composed, not overridable: a wrapper such as `DropdownMenuItem asChild`
      // passes its own onClick, which would otherwise replace the sign-out.
      onClick={(event) => {
        onClick?.(event);
        signOut.mutate();
      }}
      {...props}
    >
      <LogOutIcon className="size-4" />
      {signOut.isPending ? `${t("signing_out")}...` : t("sign_out")}
    </Button>
  );
}
