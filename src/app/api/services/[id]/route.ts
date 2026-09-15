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

export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "services.manage")) return forbidden();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.name !== undefined && !body.name?.trim()) {
      return validationError({ name: "نام خدمت الزامی است." });
    }

    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) return notFound("خدمت یافت نشد.");

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined)
      data.description = body.description?.trim() || null;
    if (body.price !== undefined && body.price !== null)
      data.price = Number(body.price);
    if (body.durationMin !== undefined && body.durationMin !== null)
      data.durationMin = Number(body.durationMin);
    if (body.category !== undefined) data.category = body.category || null;
    if (body.status !== undefined) data.status = body.status;

    const updated = await db.service.update({ where: { id }, data });

    // Optional: sync ServiceStaff relations
    if (Array.isArray(body.staffIds)) {
      await db.serviceStaff.deleteMany({ where: { serviceId: id } });
      const uniqueStaffIds = Array.from(new Set(body.staffIds as string[]));
      if (uniqueStaffIds.length) {
        await db.serviceStaff.createMany({
          data: uniqueStaffIds.map((staffId) => ({ serviceId: id, staffId })),
        });
      }
    }

    await audit({
      userId: s.id,
      action: "update",
      entity: "service",
      entityId: id,
      payload: { before: existing, after: updated, staffIds: body.staffIds },
      req,
    });

    const withStaff = await db.service.findUnique({
      where: { id },
      include: {
        staff: { include: { staff: { select: { id: true, fullName: true, color: true } } } },
      },
    });

    return ok({ service: withStaff });
  },
);

export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "services.manage")) return forbidden();

    const { id } = await params;
    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) return notFound("خدمت یافت نشد.");

    await db.service.delete({ where: { id } });
    await audit({
      userId: s.id,
      action: "delete",
      entity: "service",
      entityId: id,
      payload: { name: existing.name },
      req,
    });

    return ok({ success: true });
  },
);
