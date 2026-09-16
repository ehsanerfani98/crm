import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, withErrorHandler } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.view")) return forbidden();

  const { id } = await params;

  const [appointments, payments, notes, activities] = await Promise.all([
    db.appointment.findMany({
      where: { patientId: id },
      orderBy: { startAt: "desc" },
      take: 30,
      include: { doctor: true, service: true },
    }),
    db.payment.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.note.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { author: { select: { name: true } } },
    }),
    db.activity.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { name: true } } },
    }),
  ]);

  // Build unified timeline
  type TimelineEntry = {
    id: string;
    type: string;
    title: string;
    createdAt: Date;
    meta?: Record<string, unknown>;
    user?: string;
  };
  const timeline: TimelineEntry[] = [];
  for (const a of appointments) {
    timeline.push({
      id: `appt-${a.id}`,
      type: "appointment",
      title: `نوبت ${a.status === "done" ? "انجام شده" : a.status === "cancelled" ? "لغو شده" : "ثبت شده"}`,
      createdAt: a.createdAt,
      meta: {
        startAt: a.startAt,
        endAt: a.endAt,
        status: a.status,
        doctor: a.doctor?.fullName,
        service: a.service?.name,
        price: a.price,
      },
      user: a.doctor?.fullName,
    });
  }
  for (const p of payments) {
    timeline.push({
      id: `pay-${p.id}`,
      type: "payment",
      title: `پرداخت به مبلغ ${p.finalAmount} تومان (${methodLabel(p.method)})`,
      createdAt: p.createdAt,
      meta: { amount: p.amount, discount: p.discount, method: p.method, status: p.status },
    });
  }
  for (const n of notes) {
    timeline.push({
      id: `note-${n.id}`,
      type: "note",
      title: `یادداشت: ${n.content.slice(0, 60)}${n.content.length > 60 ? "..." : ""}`,
      createdAt: n.createdAt,
      meta: { content: n.content },
      user: n.author?.name,
    });
  }
  for (const a of activities) {
    timeline.push({
      id: `act-${a.id}`,
      type: a.type,
      title: a.title,
      createdAt: a.createdAt,
      user: a.user?.name,
    });
  }
  timeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Compute balance
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.finalAmount, 0);
  const totalBilled = appointments
    .filter((a) => a.status === "done")
    .reduce((sum, a) => sum + (a.price || 0), 0);
  const balance = totalBilled - totalPaid;

  return ok({
    timeline,
    appointments,
    payments,
    notes,
    balance,
    totalPaid,
    totalBilled,
  });
});

function methodLabel(m: string): string {
  return { cash: "نقدی", card: "کارت", transfer: "انتقال", online: "آنلاین" }[m] || m;
}
