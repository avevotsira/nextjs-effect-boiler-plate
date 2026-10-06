import { requireSession } from "@/lib/auth/guards";

import { getTranslations } from "next-intl/server";

import { AppShell } from "./_components/app-shell";
import { NotBuiltYet } from "./_components/empty-states";
import { PageHeader } from "./_components/page-header";

/** Where sign-in lands. Replace the placeholder with the app's first screen. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const { user } = await requireSession(locale);
  const t = await getTranslations("common");

  return (
    <AppShell user={user}>
      <PageHeader>
        <PageHeader.Title>{t("home")}</PageHeader.Title>
      </PageHeader>
      <NotBuiltYet />
    </AppShell>
  );
}
