import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, notFound, unauthorized, forbidden, validationError, withErrorHandler } from "@/lib/api";
import { audit, recordActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "appointments.update")) return forbidden();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const existing = await db.appointment.findUnique({ where: { id } });
  if (!existing) return notFound("نوبت یافت نشد.");

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.startAt) {
    data.startAt = new Date(body.startAt);
    if (body.endAt) data.endAt = new Date(body.endAt);
    else if (body.durationMin) {
      data.endAt = new Date(new Date(body.startAt).getTime() + body.durationMin * 60_000);
      data.durationMin = body.durationMin;
    }
  }
  if (body.doctorId !== undefined) data.doctorId = body.doctorId || null;
  if (body.serviceId !== undefined) data.serviceId = body.serviceId || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.price !== undefined) data.price = body.price;

  const updated = await db.appointment.update({
    where: { id },
    data,
    include: { patient: true, doctor: true, service: true },
  });

  await audit({ userId: s.id, action: "update", entity: "appointment", entityId: id, payload: { before: existing, after: updated }, req });
  if (body.status && body.status !== existing.status) {
    await recordActivity({
      patientId: updated.patientId,
      userId: s.id,
      type: "appointment",
      title: `وضعیت نوبت ${updated.patient.firstName} ${updated.patient.lastName} به «${statusLabel(body.status)}» تغییر یافت.`,
      meta: { before: existing.status, after: body.status },
    });
  }

  return ok({ appointment: updated });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "appointments.delete")) return forbidden();

  const { id } = await params;
  const existing = await db.appointment.findUnique({ where: { id } });
  if (!existing) return notFound();

  await db.appointment.delete({ where: { id } });
  await audit({ userId: s.id, action: "delete", entity: "appointment", entityId: id, req });

  return ok({ success: true });
});

function statusLabel(s: string): string {
  return {
    booked: "رزرو شده",
    confirmed: "تأیید شده",
    waiting: "در انتظار",
    in_progress: "در حال مراجعه",
    done: "انجام شده",
    cancelled: "لغو شده",
    no_show: "عدم مراجعه",
  }[s] || s;
}
