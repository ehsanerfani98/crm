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
  if (!hasPermission(s, "staff.view")) return forbidden();

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim();

  const where = {
    AND: [
      type && type !== "all" ? { type } : {},
      status && status !== "all" ? { status } : {},
      q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { fullName: { contains: q } },
              { specialty: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {},
    ],
  };

  const items = await db.staff.findMany({
    where,
    orderBy: [{ type: "asc" }, { fullName: "asc" }],
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
      services: {
        select: {
          service: { select: { id: true, name: true, price: true, durationMin: true } },
        },
      },
    },
  });

  return ok({ items });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "staff.manage")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (!body.firstName?.trim()) errors.firstName = "نام الزامی است.";
  if (!body.lastName?.trim()) errors.lastName = "نام خانوادگی الزامی است.";
  if (!body.fullName?.trim()) errors.fullName = "نام کامل الزامی است.";
  if (!body.type) errors.type = "نوع کارکن الزامی است.";
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
    errors.email = "ایمیل معتبر نیست.";
  }
  if (body.phone && !/^0\d{10}$/.test(String(body.phone).trim())) {
    errors.phone = "شماره تلفن باید ۱۱ رقم و با ۰ شروع شود.";
  }
  if (Object.keys(errors).length) return validationError(errors);

  // If userId provided, ensure not already linked to another staff
  if (body.userId) {
    const linked = await db.staff.findUnique({ where: { userId: body.userId } });
    if (linked) return failExistingUser();
  }

  const staff = await db.staff.create({
    data: {
      userId: body.userId || null,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      fullName: body.fullName.trim(),
      type: body.type,
      specialty: body.specialty?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      status: body.status || "active",
      workDays: body.workDays || null,
      workStart: body.workStart || null,
      workEnd: body.workEnd || null,
      color: body.color || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
    },
  });

  await audit({
    userId: s.id,
    action: "create",
    entity: "staff",
    entityId: staff.id,
    payload: { fullName: staff.fullName, type: staff.type },
    req,
  });

  return ok({ staff });
});

function failExistingUser() {
  return Response.json(
    { ok: false, error: "این کاربر قبلاً به عضو دیگری متصل است." },
    { status: 409 },
  );
}
