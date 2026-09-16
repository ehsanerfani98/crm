import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, fail, unauthorized, forbidden, validationError, pagination, withErrorHandler } from "@/lib/api";
import { audit, recordActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.view")) return forbidden();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const { skip, take, page, pageSize } = pagination(url.searchParams);

  const where = {
    AND: [
      status && status !== "all" ? { status } : {},
      q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { mobile: { contains: q } },
              { nationalId: { contains: q } },
              { code: { contains: q } },
            ],
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    db.patient.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { appointments: true, payments: true } } },
    }),
    db.patient.count({ where }),
  ]);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.create")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (!body.firstName?.trim()) errors.firstName = "نام الزامی است.";
  if (!body.lastName?.trim()) errors.lastName = "نام خانوادگی الزامی است.";
  if (body.mobile && !/^09\d{9}$/.test(String(body.mobile).trim())) {
    errors.mobile = "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد.";
  }
  if (body.nationalId && !/^\d{10}$/.test(String(body.nationalId).trim())) {
    errors.nationalId = "کد ملی باید ۱۰ رقم باشد.";
  }
  if (Object.keys(errors).length) return validationError(errors);

  // Check uniqueness of mobile/nationalId/code
  if (body.mobile) {
    const exists = await db.patient.findUnique({ where: { mobile: String(body.mobile).trim() } });
    if (exists) return fail("شماره موبایل قبلاً ثبت شده است.", 409);
  }
  if (body.nationalId) {
    const exists = await db.patient.findUnique({ where: { nationalId: String(body.nationalId).trim() } });
    if (exists) return fail("کد ملی قبلاً ثبت شده است.", 409);
  }

  // Generate next patient code
  const lastPatient = await db.patient.findFirst({ orderBy: { code: "desc" } });
  let nextNum = 1001;
  if (lastPatient?.code) {
    const m = lastPatient.code.match(/P-(\d+)/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  const code = `P-${nextNum}`;

  const patient = await db.patient.create({
    data: {
      code,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      mobile: body.mobile?.trim() || null,
      phone: body.phone?.trim() || null,
      nationalId: body.nationalId?.trim() || null,
      gender: body.gender || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      description: body.description?.trim() || null,
      status: body.status || "active",
      source: body.source || "walk_in",
      createdById: s.id,
    },
  });

  await audit({ userId: s.id, action: "create", entity: "patient", entityId: patient.id, payload: { code: patient.code }, req });
  await recordActivity({ patientId: patient.id, userId: s.id, type: "status", title: `پرونده مراجع ${patient.firstName} ${patient.lastName} ایجاد شد.` });

  return ok({ patient });
});
