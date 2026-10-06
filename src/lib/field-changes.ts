import type { FieldChanges } from "@/db/schema";

/**
 * The fields `patch` changes on `before`, each with its old and new value,
 * for an `activity_logs` row. Pure and shared by every resource's
 * update, hence its own module and test.
 *
 * - Only keys in `patch` are compared, so metadata the caller sets
 *   (`updated_at`, `updated_by`) never lands in history.
 * - `undefined` means "not sent" and is skipped. `null` is a value, so
 *   `null → 0` is a change: unknown is never zero.
 * - Two values are equal when their JSON is, which is how `changes` stores
 *   them: Dates compare by instant, arrays by order.
 *
 * For a create, diff from `{}`. An empty result means nothing changed, and the
 * caller writes no log row.
 */
export function diffFields<Row extends object>(
  before: Partial<Row>,
  patch: Partial<Row>,
): FieldChanges {
  const changes: FieldChanges = {};
  for (const field in patch) {
    const after = patch[field];
    if (after === undefined) continue;
    const old = before[field] ?? null;
    if (JSON.stringify(old) !== JSON.stringify(after))
      changes[field] = { before: old, after };
  }
  return changes;
}
