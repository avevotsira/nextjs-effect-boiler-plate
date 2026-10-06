import { generateIdFromEntropySize } from "@/lib/random";

import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { userTable } from "./user";

/**
 * Maps a user to an identity at a sign-in provider (better-auth shape):
 * `provider_id` names the provider, `account_id` is the person's ID there,
 * e.g. an OIDC `sub`. Together they identify the person on every sign-in
 * (`authService.signInWithAccount`). Written with the user
 * (`npm run seed:user`); sign-in never writes it.
 *
 * `provider_id` is a fixed name (`keycloak`, `github`), never an issuer URL:
 * a URL changes when the provider moves host, and every stored row would stop
 * matching. Type it with a const object once the first provider exists.
 */
export const accountTable = pgTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateIdFromEntropySize(15)),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    unique("accounts_provider_account_uidx").on(t.providerId, t.accountId),
    // One identity per user per provider.
    unique("accounts_user_provider_uidx").on(t.userId, t.providerId),
  ],
);

export type Account = InferSelectModel<typeof accountTable>;
export type NewAccount = InferInsertModel<typeof accountTable>;
