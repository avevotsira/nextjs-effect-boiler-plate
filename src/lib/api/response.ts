/**
 * Wire shape shared by every `app/api/**` route and every client fetch.
 * Isomorphic: no server imports. The server builds it in
 * `src/server/errors.ts`; the client reads it in `src/lib/api/client.ts`.
 */

export type ApiError = {
  /** HTTP status. Conveyed by the response, not duplicated in the body. */
  status: number;
  /** Machine-readable code the client can branch on, e.g. "NOT_FOUND". */
  code: string;
  /** Human-readable message safe to display to end users. */
  message: string;
};

export type ApiErrorBody = Omit<ApiError, "status">;

/** Discriminated envelope: `if (res.ok) use(res.data); else show(res.error)`. */
export type ApiResponse<TData> =
  | { ok: true; data: TData }
  | { ok: false; error: ApiErrorBody };

/** One page of a list endpoint. `page` is 1-based. */
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

/** A list's last page number; 1 when the list is empty. */
export const lastPageOf = ({
  total,
  pageSize,
}: Pick<Page<never>, "total" | "pageSize">) =>
  Math.max(1, Math.ceil(total / pageSize));
