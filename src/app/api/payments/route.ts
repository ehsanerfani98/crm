import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  unauthorized,
  forbidden,
  validationError,
  pagination,
  withErrorHandler,
} from "@/lib/api";
import { audit, recordActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "financial.view")) return forbidden();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const patientId = url.searchParams.get("patientId");
  const method = url.searchParams.get("method");
  const status = url.searchParams.get("status");
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const { skip, take, page, pageSize } = pagination(url.searchParams);

  const dateFilter: Record<string, Date> = {};
  if (fromStr && fromStr.trim()) {
    const d = new Date(fromStr);
    if (!isNaN(d.getTime())) dateFilter.gte = d;
  }
  if (toStr && toStr.trim()) {
    const d = new Date(toStr);
    if (!isNaN(d.getTime())) dateFilter.lte = d;
  }

  const where = {
    AND: [
      patientId ? { patientId } : {},
      method && method !== "all" ? { method } : {},
      status && status !== "all" ? { status } : {},
      Object.keys(dateFilter).length ? { createdAt: dateFilter } : {},
      q ? { reference: { contains: q } } : {},
    ],
  };

  const [items, total, totals] = await Promise.all([
    db.payment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: { id: true, code: true, firstName: true, lastName: true, mobile: true },
        },
        appointment: {
          select: { id: true, startAt: true, service: { select: { id: true, name: true } } },
        },
        receivedBy: { select: { id: true, name: true } },
      },
    }),
    db.payment.count({ where }),
    db.payment.aggregate({
      where: { ...where, status: "paid" },
      _sum: { finalAmount: true, discount: true, amount: true },
    }),
  ]);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    summary: {
      totalRevenue: totals._sum.finalAmount || 0,
      totalDiscount: totals._sum.discount || 0,
      totalAmount: totals._sum.amount || 0,
    },
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "financial.create")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (!body.patientId) errors.patientId = "انتخاب مراجع الزامی است.";
  if (body.amount === undefined || Number.isNaN(Number(body.amount)))
    errors.amount = "مبلغ الزامی است.";
  if (body.finalAmount === undefined || Number.isNaN(Number(body.finalAmount)))
    errors.finalAmount = "مبلغ نهایی الزامی است.";
  if (!body.method) errors.method = "روش پرداخت الزامی است.";
  if (Object.keys(errors).length) return validationError(errors);

  // Validate patient exists
  const patient = await db.patient.findUnique({ where: { id: body.patientId } });
  if (!patient) return validationError({ patientId: "مراجع یافت نشد." });

  const payment = await db.payment.create({
    data: {
      patientId: body.patientId,
      appointmentId: body.appointmentId || null,
      amount: Number(body.amount),
      discount: Number(body.discount) || 0,
      finalAmount: Number(body.finalAmount),
      method: body.method,
      status: body.status || "paid",
      reference: body.reference?.trim() || null,
      notes: body.notes?.trim() || null,
      receivedById: s.id,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, code: true } },
      appointment: { select: { id: true, startAt: true } },
    },
  });

  await audit({
    userId: s.id,
    action: "create",
    entity: "payment",
    entityId: payment.id,
    payload: {
      patientId: payment.patientId,
      amount: payment.amount,
      finalAmount: payment.finalAmount,
      method: payment.method,
    },
    req,
  });
  await recordActivity({
    patientId: payment.patientId,
    userId: s.id,
    type: "payment",
    title: `پرداخت ${payment.finalAmount.toLocaleString("fa-IR")} تومانی برای ${patient.firstName} ${patient.lastName} ثبت شد.`,
    meta: {
      paymentId: payment.id,
      method: payment.method,
      finalAmount: payment.finalAmount,
      reference: payment.reference,
    },
  });

  return ok({ payment });
});
