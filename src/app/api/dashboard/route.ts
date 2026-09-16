import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  daysAgo,
  formatNumber,
} from "@/lib/persian";

export async function GET() {
  const s = await getSession();
  if (!s) return unauthorized();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    todayAppointments,
    upcomingAppointments,
    todayNewPatients,
    todayPayments,
    monthPayments,
    pendingTasks,
    overdueTasks,
    openLeads,
    appointmentsByStatus,
    paymentsLast7Days,
  ] = await Promise.all([
    db.appointment.count({
      where: { startAt: { gte: todayStart, lte: todayEnd }, status: { notIn: ["cancelled", "no_show"] } },
    }),
    db.appointment.findMany({
      where: { startAt: { gte: now }, status: { notIn: ["cancelled", "no_show", "done"] } },
      take: 6,
      orderBy: { startAt: "asc" },
      include: { patient: true, doctor: true, service: true },
    }),
    db.patient.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    db.payment.aggregate({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, status: "paid" },
      _sum: { finalAmount: true },
    }),
    db.payment.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd }, status: "paid" },
      _sum: { finalAmount: true },
    }),
    db.task.count({ where: { status: { in: ["pending", "in_progress"] } } }),
    db.task.count({
      where: {
        status: { in: ["pending", "in_progress"] },
        dueDate: { lt: now },
      },
    }),
    db.lead.count({ where: { status: { notIn: ["customer", "lost"] } } }),
    db.appointment.groupBy({
      by: ["status"],
      where: { startAt: { gte: monthStart, lte: monthEnd } },
      _count: true,
    }),
    (async () => {
      const out: { date: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dStart = startOfDay(daysAgo(i));
        const dEnd = endOfDay(daysAgo(i));
        const r = await db.payment.aggregate({
          where: { createdAt: { gte: dStart, lte: dEnd }, status: "paid" },
          _sum: { finalAmount: true },
        });
        out.push({ date: dStart.toISOString(), total: r._sum.finalAmount || 0 });
      }
      return out;
    })(),
  ]);

  const recentActivities = await db.activity.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } }, patient: { select: { firstName: true, lastName: true } } },
  });

  const todayRevenue = todayPayments._sum.finalAmount || 0;
  const monthRevenue = monthPayments._sum.finalAmount || 0;

  return ok({
    stats: {
      todayAppointments,
      upcomingCount: upcomingAppointments.length,
      todayNewPatients,
      todayRevenue,
      monthRevenue,
      pendingTasks,
      overdueTasks,
      openLeads,
    },
    upcomingAppointments: upcomingAppointments.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      price: a.price,
      patient: { id: a.patient.id, name: `${a.patient.firstName} ${a.patient.lastName}`, mobile: a.patient.mobile },
      doctor: a.doctor ? { id: a.doctor.id, name: a.doctor.fullName } : null,
      service: a.service ? { id: a.service.id, name: a.service.name } : null,
    })),
    appointmentsByStatus: appointmentsByStatus.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    paymentsLast7Days,
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      createdAt: a.createdAt,
      user: a.user?.name,
      patient: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : null,
    })),
  });
}
