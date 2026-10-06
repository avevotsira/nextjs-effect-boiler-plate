import { type Result, err, ok } from "@justmiracle/result";

import type { ApiError, ApiResponse } from "./response";

/**
 * Thrown by query/mutation functions after `Result` is unwrapped at the
 * TanStack Query boundary (which is throw-on-error by design). Carries the
 * full `ApiError` so consumers can branch on `.apiError.code`.
 */
export class ApiClientError extends Error {
  readonly apiError: ApiError;
  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.apiError = apiError;
  }
}

const NETWORK_ERROR: ApiError = {
  status: 503,
  code: "NETWORK_ERROR",
  message: "Could not connect to the server. Please try again.",
};

const INVALID_RESPONSE: ApiError = {
  status: 500,
  code: "INVALID_RESPONSE",
  message: "The server returned an unexpected response.",
};

/**
 * Client-side fetch returning `Result<T, ApiError>` — never throws.
 * `T` is the caller's claim about the payload; validate it with the endpoint's
 * schema before trusting it.
 */
export async function apiFetch<TData>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Result<TData, ApiError>> {
  const res = await fetch(input, init).then(ok, () => err(NETWORK_ERROR));
  if (res.isErr) return res;

  // SAFETY: every app/api route body is produced by `toResponse` in
  // src/server/errors.ts, so it is an `ApiResponse`. The `ok` discriminant is
  // checked below; `TData` is the caller's claim, which the caller validates
  // with the endpoint's schema before use.
  const body = await res.value.json().then(
    (json) => ok(json as ApiResponse<TData>),
    () => err(INVALID_RESPONSE),
  );
  if (body.isErr) return body;

  if (!body.value.ok) {
    return err({ ...body.value.error, status: res.value.status });
  }
  return ok(body.value.data);
}
