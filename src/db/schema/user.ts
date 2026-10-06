import { generateIdFromEntropySize } from "@/lib/random";

import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * A person allowed into the app, in better-auth shape: this row is the
 * identity, `accounts` maps it to a sign-in provider's ID, `sessions` holds
 * the sign-ins. Created ahead of sign-in (`npm run seed:user`): the provider
 * proves who someone is, this row says they may come in. Never deleted:
 * `deactivated_at` set means Deactivated, else Active.
 */
export const userTable = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateIdFromEntropySize(15)),
    // Stored lowercase. Not used to sign in: that goes through `accounts`.
    email: text("email").notNull(),
    deactivatedAt: timestamp("deactivated_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("users_email_uniq").on(t.email)],
);

export type User = InferSelectModel<typeof userTable>;
export type NewUser = InferInsertModel<typeof userTable>;
