import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  withErrorHandler,
} from "@/lib/api";
import { audit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "staff.view")) return forbidden();

    const { id } = await params;
    const staff = await db.staff.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        services: {
          select: {
            service: {
              select: { id: true, name: true, price: true, durationMin: true, category: true },
            },
          },
        },
        _count: { select: { appointments: true } },
      },
    });
    if (!staff) return notFound("عضو کادر یافت نشد.");

    return ok({ staff });
  },
);

export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "staff.manage")) return forbidden();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.firstName !== undefined && !body.firstName?.trim()) {
      return validationError({ firstName: "نام الزامی است." });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
      return validationError({ email: "ایمیل معتبر نیست." });
    }

    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) return notFound("عضو کادر یافت نشد.");

    if (body.userId && body.userId !== existing.userId) {
      const linked = await db.staff.findUnique({ where: { userId: body.userId } });
      if (linked && linked.id !== id) {
        return Response.json(
          { ok: false, error: "این کاربر قبلاً به عضو دیگری متصل است." },
          { status: 409 },
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (body.firstName !== undefined) data.firstName = body.firstName.trim();
    if (body.lastName !== undefined) data.lastName = body.lastName.trim();
    if (body.fullName !== undefined) data.fullName = body.fullName.trim();
    if (body.type !== undefined) data.type = body.type;
    if (body.specialty !== undefined)
      data.specialty = body.specialty?.trim() || null;
    if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
    if (body.email !== undefined) data.email = body.email?.trim() || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.workDays !== undefined) data.workDays = body.workDays || null;
    if (body.workStart !== undefined) data.workStart = body.workStart || null;
    if (body.workEnd !== undefined) data.workEnd = body.workEnd || null;
    if (body.color !== undefined) data.color = body.color || null;
    if (body.userId !== undefined) data.userId = body.userId || null;

    const updated = await db.staff.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });

    await audit({
      userId: s.id,
      action: "update",
      entity: "staff",
      entityId: id,
      payload: { before: existing, after: updated },
      req,
    });

    return ok({ staff: updated });
  },
);

export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "staff.manage")) return forbidden();

    const { id } = await params;
    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) return notFound("عضو کادر یافت نشد.");

    await db.staff.delete({ where: { id } });
    await audit({
      userId: s.id,
      action: "delete",
      entity: "staff",
      entityId: id,
      payload: { fullName: existing.fullName },
      req,
    });

    return ok({ success: true });
  },
);
