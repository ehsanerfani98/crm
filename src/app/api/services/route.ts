import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  unauthorized,
  forbidden,
  validationError,
  withErrorHandler,
} from "@/lib/api";
import { audit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "services.view")) return forbidden();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");

  const where = {
    AND: [
      status && status !== "all" ? { status } : {},
      category && category !== "all" ? { category } : {},
    ],
  };

  const items = await db.service.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      staff: { select: { staffId: true, staff: { select: { id: true, fullName: true, color: true } } } },
      _count: { select: { appointments: true } },
    },
  });

  return ok({ items });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "services.manage")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (!body.name?.trim()) errors.name = "نام خدمت الزامی است.";
  if (body.price === undefined || body.price === null || Number.isNaN(Number(body.price)))
    errors.price = "قیمت خدمت الزامی است.";
  if (Object.keys(errors).length) return validationError(errors);

  const service = await db.service.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      price: Number(body.price),
      durationMin: Number(body.durationMin) || 30,
      category: body.category || null,
      status: body.status || "active",
    },
  });

  // Optionally link staff on creation
  if (Array.isArray(body.staffIds) && body.staffIds.length) {
    const uniqueStaffIds = Array.from(new Set(body.staffIds as string[]));
    await db.serviceStaff.createMany({
      data: uniqueStaffIds.map((staffId) => ({ serviceId: service.id, staffId })),
    });
  }

  await audit({
    userId: s.id,
    action: "create",
    entity: "service",
    entityId: service.id,
    payload: { name: service.name, price: service.price },
    req,
  });

  const withStaff = await db.service.findUnique({
    where: { id: service.id },
    include: { staff: { include: { staff: { select: { id: true, fullName: true, color: true } } } } },
  });

  return ok({ service: withStaff });
});
