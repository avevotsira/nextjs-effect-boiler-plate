import { generateIdFromEntropySize } from "@/lib/random";

import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { bytea, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { userTable } from "./user";

/**
 * A signed-in browser. The cookie holds `<id>.<secret>`; only the SHA-256 of
 * the secret is stored. Expiry is a sliding inactivity window on
 * `last_verified_at`.
 */
export const sessionTable = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateIdFromEntropySize(15)),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  secretHash: bytea("secret_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  lastVerifiedAt: timestamp("last_verified_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
  userAgent: text("user_agent"),
  clientIp: text("client_ip"),
});

export type Session = InferSelectModel<typeof sessionTable>;
export type NewSession = InferInsertModel<typeof sessionTable>;
