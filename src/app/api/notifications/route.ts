import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  unauthorized,
  pagination,
  withErrorHandler,
} from "@/lib/api";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // unread | all
  const type = url.searchParams.get("type");
  const { skip, take, page, pageSize } = pagination(url.searchParams);

  const where = {
    AND: [
      { userId: s.id },
      filter === "unread" ? { read: false } : {},
      type && type !== "all" ? { type } : {},
    ],
  };

  const [items, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: s.id, read: false } }),
  ]);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    unreadCount,
  });
});
