import { redirect } from "next/navigation";

import { ErrorMessage } from "@/components/error-message";
import { LanguageToggle } from "@/components/lang/language-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { readCurrentSession } from "@/lib/auth/guards";

import { getTranslations } from "next-intl/server";
import { z } from "zod";

/**
 * `AccessDenied` reasons a sign-in callback redirects here with
 * (`?error=`). Add your sign-in method's own failures here and under
 * `auth.errors` in both message files.
 */
const loginError = z.enum(["unregistered", "deactivated"]);

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  if (await readCurrentSession()) redirect(`/${locale}`);
  const t = await getTranslations("auth");
  const { error } = await searchParams;
  // Anything outside the known set is someone editing the URL: say nothing.
  const reason = loginError.safeParse(error).data;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <LanguageToggle />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("sign_in_title")}</CardTitle>
          <CardDescription>{t("sign_in_description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ErrorMessage>{reason && t(`errors.${reason}`)}</ErrorMessage>
          {/* The sign-in method goes here: a button that starts an OAuth
              redirect, or a form. Its callback route proves who the person
              is, then calls `authService.signInWithAccount` and writes the
              cookie with `SessionCookieWriter`. */}
        </CardContent>
      </Card>
    </main>
  );
}
