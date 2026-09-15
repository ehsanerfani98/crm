/**
 * Helpers to keep API routes concise and consistent.
 */
import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: message, ...extra },
    { status },
  );
}

export function unauthorized(message = "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function forbidden(message = "دسترسی غیرمجاز") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

export function notFound(message = "مورد مورد نظر یافت نشد") {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

export function validationError(errors: Record<string, string>) {
  return NextResponse.json(
    { ok: false, error: "اطلاعات وارد شده معتبر نیست.", errors },
    { status: 422 },
  );
}

/** Wrap an async route handler with try/catch and standard error response. */
export function withErrorHandler<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطای ناشناخته رخ داد.";
      const status =
        err instanceof Error && err.message.includes("دسترسی غیرمجاز") ? 403 : 500;
      console.error("[api error]", err);
      return fail(message, status);
    }
  };
}

/** Parse pagination params from a URL. */
export function pagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
