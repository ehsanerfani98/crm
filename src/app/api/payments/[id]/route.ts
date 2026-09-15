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
import { audit, recordActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "financial.update")) return forbidden();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (
      body.amount !== undefined &&
      (body.amount === null || Number.isNaN(Number(body.amount)))
    ) {
      return validationError({ amount: "مبلغ معتبر نیست." });
    }

    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) return notFound("پرداخت یافت نشد.");

    const data: Record<string, unknown> = {};
    if (body.patientId !== undefined) data.patientId = body.patientId;
    if (body.appointmentId !== undefined)
      data.appointmentId = body.appointmentId || null;
    if (body.amount !== undefined) data.amount = Number(body.amount);
    if (body.discount !== undefined) data.discount = Number(body.discount) || 0;
    if (body.finalAmount !== undefined) data.finalAmount = Number(body.finalAmount);
    if (body.method !== undefined) data.method = body.method;
    if (body.status !== undefined) data.status = body.status;
    if (body.reference !== undefined)
      data.reference = body.reference?.trim() || null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

    const updated = await db.payment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, code: true } },
      },
    });

    await audit({
      userId: s.id,
      action: "update",
      entity: "payment",
      entityId: id,
      payload: { before: existing, after: updated },
      req,
    });
    if (body.status && body.status !== existing.status) {
      await recordActivity({
        patientId: updated.patientId,
        userId: s.id,
        type: "payment",
        title: `وضعیت پرداخت به «${body.status}» تغییر یافت.`,
        meta: { before: existing.status, after: body.status, paymentId: id },
      });
    }

    return ok({ payment: updated });
  },
);

export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "financial.delete")) return forbidden();

    const { id } = await params;
    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) return notFound("پرداخت یافت نشد.");

    await db.payment.delete({ where: { id } });
    await audit({
      userId: s.id,
      action: "delete",
      entity: "payment",
      entityId: id,
      payload: { amount: existing.amount, finalAmount: existing.finalAmount },
      req,
    });

    return ok({ success: true });
  },
);
