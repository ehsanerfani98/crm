import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  unauthorized,
  forbidden,
  pagination,
  withErrorHandler,
} from "@/lib/api";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "audit.view")) return forbidden();

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const entity = url.searchParams.get("entity");
  const action = url.searchParams.get("action");
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const { skip, take, page, pageSize } = pagination(url.searchParams);

  const dateFilter: Record<string, Date> = {};
  if (fromStr) dateFilter.gte = new Date(fromStr);
  if (toStr) dateFilter.lte = new Date(toStr);

  const where = {
    AND: [
      userId ? { userId } : {},
      entity && entity !== "all" ? { entity } : {},
      action && action !== "all" ? { action } : {},
      Object.keys(dateFilter).length ? { createdAt: dateFilter } : {},
    ],
  };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});
