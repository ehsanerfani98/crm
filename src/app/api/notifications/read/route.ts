import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandler } from "@/lib/api";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();

  const result = await db.notification.updateMany({
    where: { userId: s.id, read: false },
    data: { read: true },
  });

  return ok({ marked: result.count });
});
