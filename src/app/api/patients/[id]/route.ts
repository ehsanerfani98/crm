import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, fail, notFound, unauthorized, forbidden, validationError, withErrorHandler } from "@/lib/api";
import { audit, recordActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.view")) return forbidden();

  const { id } = await params;
  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      _count: { select: { appointments: true, payments: true, notes: true } },
    },
  });
  if (!patient) return notFound("مراجع یافت نشد");

  return ok({ patient });
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.update")) return forbidden();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (body.firstName !== undefined && !body.firstName?.trim()) errors.firstName = "نام الزامی است.";
  if (body.lastName !== undefined && !body.lastName?.trim()) errors.lastName = "نام خانوادگی الزامی است.";
  if (body.mobile && !/^09\d{9}$/.test(String(body.mobile).trim())) {
    errors.mobile = "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد.";
  }
  if (Object.keys(errors).length) return validationError(errors);

  const existing = await db.patient.findUnique({ where: { id } });
  if (!existing) return notFound();

  if (body.mobile && body.mobile !== existing.mobile) {
    const dup = await db.patient.findUnique({ where: { mobile: body.mobile } });
    if (dup) return fail("شماره موبایل قبلاً ثبت شده است.", 409);
  }

  const updated = await db.patient.update({
    where: { id },
    data: {
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      mobile: body.mobile?.trim() || null,
      phone: body.phone?.trim() || null,
      nationalId: body.nationalId?.trim() || null,
      gender: body.gender || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      description: body.description?.trim() || null,
      status: body.status,
      source: body.source,
    },
  });

  await audit({ userId: s.id, action: "update", entity: "patient", entityId: id, payload: { before: existing, after: updated }, req });
  await recordActivity({ patientId: id, userId: s.id, type: "status", title: `اطلاعات مراجع به‌روزرسانی شد.` });

  return ok({ patient: updated });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.delete")) return forbidden();

  const { id } = await params;
  const existing = await db.patient.findUnique({ where: { id } });
  if (!existing) return notFound();

  await db.patient.delete({ where: { id } });
  await audit({ userId: s.id, action: "delete", entity: "patient", entityId: id, payload: { code: existing.code, name: `${existing.firstName} ${existing.lastName}` }, req });

  return ok({ success: true });
});
