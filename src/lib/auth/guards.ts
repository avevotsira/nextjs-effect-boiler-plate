import { redirect } from "next/navigation";

import { type CurrentSession, currentSession } from "@/server/auth/current";
import { runtime } from "@/server/runtime";

/**
 * Page guards. Guards belong in pages, never in layouts: a layout is served
 * from the client router cache without a server request, so a `redirect()`
 * there replays a stale decision on later navigations.
 */

/** The request's session, or null. */
export const readCurrentSession = (): Promise<CurrentSession | null> =>
  runtime.runPromise(currentSession);

/** The request's session, or a redirect (throw) to the login page. */
export async function requireSession(locale: string): Promise<CurrentSession> {
  const current = await readCurrentSession();
  // ponytail: no return-to; sign-in always lands on `/`. Add a sanitised
  // `?returnTo=` (public-report-system's `lib/return-to.ts`) when deep links matter.
  if (!current) redirect(`/${locale}/login`);
  return current;
}
