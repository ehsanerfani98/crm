import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, fail, unauthorized, forbidden, validationError, pagination, withErrorHandler } from "@/lib/api";
import { audit, recordActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "@/lib/persian";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "appointments.view")) return forbidden();

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "list"; // list | calendar
  const status = url.searchParams.get("status");
  const doctorId = url.searchParams.get("doctorId");
  const patientId = url.searchParams.get("patientId");
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const { skip, take, page, pageSize } = pagination(url.searchParams);

  const from = fromStr ? new Date(fromStr) : startOfWeek(new Date());
  const to = toStr ? new Date(toStr) : endOfWeek(new Date());

  const where = {
    AND: [
      { startAt: { gte: from, lte: to } },
      status && status !== "all" ? { status } : {},
      doctorId ? { doctorId } : {},
      patientId ? { patientId } : {},
    ],
  };

  if (view === "calendar") {
    const items = await db.appointment.findMany({
      where,
      orderBy: { startAt: "asc" },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mobile: true, code: true } },
        doctor: { select: { id: true, fullName: true, color: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
    });
    return ok({ items, from, to });
  }

  const [items, total] = await Promise.all([
    db.appointment.findMany({
      where,
      skip,
      take,
      orderBy: { startAt: "desc" },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mobile: true, code: true } },
        doctor: { select: { id: true, fullName: true, color: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
    }),
    db.appointment.count({ where }),
  ]);

  return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "appointments.create")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (!body.patientId) errors.patientId = "انتخاب مراجع الزامی است.";
  if (!body.startAt) errors.startAt = "زمان شروع نوبت الزامی است.";
  if (Object.keys(errors).length) return validationError(errors);

  const startAt = new Date(body.startAt);
  let endAt: Date;
  if (body.endAt) {
    endAt = new Date(body.endAt);
  } else {
    const dur = body.durationMin || 30;
    endAt = new Date(startAt.getTime() + dur * 60_000);
  }

  // Fetch service price if not provided
  let price = body.price;
  if (price === undefined && body.serviceId) {
    const service = await db.service.findUnique({ where: { id: body.serviceId } });
    if (service) price = service.price;
  }

  const appointment = await db.appointment.create({
    data: {
      patientId: body.patientId,
      doctorId: body.doctorId || null,
      serviceId: body.serviceId || null,
      roomId: body.roomId || null,
      startAt,
      endAt,
      durationMin: body.durationMin || Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
      status: body.status || "booked",
      notes: body.notes?.trim() || null,
      price,
      createdById: s.id,
    },
    include: {
      patient: true,
      doctor: true,
      service: true,
    },
  });

  await audit({ userId: s.id, action: "create", entity: "appointment", entityId: appointment.id, payload: { patientId: appointment.patientId, startAt }, req });
  await recordActivity({
    patientId: appointment.patientId,
    userId: s.id,
    type: "appointment",
    title: `نوبت جدید برای ${appointment.patient.firstName} ${appointment.patient.lastName} ثبت شد.`,
    meta: { startAt, doctor: appointment.doctor?.fullName, service: appointment.service?.name },
  });

  return ok({ appointment });
});
