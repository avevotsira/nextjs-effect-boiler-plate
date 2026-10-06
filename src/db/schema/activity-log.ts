import { generateIdFromEntropySize } from "@/lib/random";

import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Before/after values per changed field. */
export type FieldChanges = Record<
  string,
  { readonly before: unknown; readonly after: unknown }
>;

/**
 * Append-only record of every change: one row per action, nothing overwritten.
 * Polymorphic on `target_type` + `target_id`, so one table serves the change
 * history of every resource. Write the row in the same transaction as the
 * change; `diffFields` (`src/lib/field-changes.ts`) builds `changes` for an
 * update.
 *
 * `action` and `target_type` are plain text, not Postgres enums, so a new
 * action needs no migration. Type them once the first ones exist:
 *
 *   export const ACTIVITY_ACTION = { USER_CREATED: "user_created" } as const;
 *   action: text("action").$type<ActivityAction>().notNull(),
 *
 * No foreign keys: the target is polymorphic, and an audit row must outlive
 * whatever it describes.
 */
export const activityLogTable = pgTable(
  "activity_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateIdFromEntropySize(16)),
    // Null only for system events; a change a person made names them.
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    changes: jsonb("changes").$type<FieldChanges>(),
    // `clock_timestamp()`, not `now()`: `now()` is the transaction start and
    // ties every row written in one transaction, defeating newest-first order.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (t) => [
    index("activity_logs_target_idx").on(t.targetType, t.targetId, t.createdAt),
    index("activity_logs_actor_id_idx").on(t.actorId),
  ],
);

export type ActivityLog = InferSelectModel<typeof activityLogTable>;
export type NewActivityLog = InferInsertModel<typeof activityLogTable>;
