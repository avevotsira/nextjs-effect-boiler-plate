"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/db/schema";
import { cn } from "@/lib/utils";

import { ChevronDownIcon, CircleUserRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The signed-in account, placed after the language toggle: who you are, and
 * sign-out. A popover rather than a dropdown menu: it is mostly text to read,
 * and a menu hides non-item text from screen readers.
 */
export function UserMenu({
  user,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  user: Pick<User, "email">;
}) {
  const t = useTranslations();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          data-slot="user-menu"
          aria-label={t("shell.account", { email: user.email })}
          className={cn("gap-2", className)}
          {...props}
        >
          <CircleUserRoundIcon aria-hidden className="size-5" />
          <span className="hidden max-w-48 truncate md:inline">
            {user.email}
          </span>
          <ChevronDownIcon aria-hidden className="size-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle className="break-all">{user.email}</PopoverTitle>
        </PopoverHeader>
        <Separator className="my-3" />
        <SignOutButton variant="ghost" className="w-full justify-start" />
      </PopoverContent>
    </Popover>
  );
}
