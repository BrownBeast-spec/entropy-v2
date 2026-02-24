import type { Context } from "hono";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export function errorResponse(
  c: Context,
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): Response {
  return c.json<ApiError>(
    { error: { code, message, details } },
    status as Parameters<typeof c.json>[1],
  );
}
