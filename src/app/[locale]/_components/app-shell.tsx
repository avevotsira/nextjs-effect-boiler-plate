import { LanguageToggle } from "@/components/lang/language-toggle";
import type { User } from "@/db/schema";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { getTranslations } from "next-intl/server";

import { UserMenu } from "./user-menu";

/**
 * The frame every signed-in page wraps itself in: the header. Not a
 * `layout.tsx`: pages guard the session, and a layout is served from the
 * client router cache without a server request (`lib/auth/guards.ts`).
 */
export async function AppShell({
  user,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  user: Pick<User, "email">;
}) {
  const t = await getTranslations();

  return (
    <div
      data-slot="app-shell"
      className={cn("flex min-h-dvh flex-col", className)}
      {...props}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:font-medium focus:text-primary focus:shadow-md"
      >
        {t("shell.skip_to_content")}
      </a>
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 md:px-6">
          <Link
            href="/"
            className="min-w-0 truncate rounded-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {t("common.app_name")}
          </Link>
          {/* Language before the account control. */}
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <LanguageToggle className="border-white/40 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white" />
            <UserMenu
              // Only what the menu shows crosses to the client.
              user={{ email: user.email }}
              className="text-white hover:bg-white/10 hover:text-white"
            />
          </div>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8"
      >
        {children}
      </main>
    </div>
  );
}
