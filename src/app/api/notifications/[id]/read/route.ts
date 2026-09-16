import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, notFound, unauthorized, forbidden, withErrorHandler } from "@/lib/api";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();

    const { id } = await params;
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) return notFound("اعلان یافت نشد.");
    if (notification.userId !== s.id) return forbidden("شما به این اعلان دسترسی ندارید.");

    if (!notification.read) {
      await db.notification.update({
        where: { id },
        data: { read: true },
      });
    }

    return ok({ success: true });
  },
);
