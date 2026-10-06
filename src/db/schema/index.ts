/**
 * Barrel for every table; `drizzle.config.ts` reads this file.
 *
 * One file per table, re-exported here:
 * - `export const <name>Table = pgTable("<plural_snake>", …)`
 * - ids: `text("id").primaryKey().$defaultFn(() => generateIdFromEntropySize(15))`
 * - timestamps: `timestamp(…, { withTimezone: true, mode: "date" }).defaultNow().notNull()`
 * - indexes: `<table>_<col>_uniq` / `<table>_<col>_idx`
 * - types: name them for what they are in the domain (AGENTS.md → Type names)
 */
export * from "./user";
export * from "./account";
export * from "./session";
export * from "./activity-log";
