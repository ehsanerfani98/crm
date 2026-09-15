import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  unauthorized,
  forbidden,
  withErrorHandler,
} from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { startOfMonth, endOfMonth } from "@/lib/persian";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "reports.view")) return forbidden();

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  const from = fromStr ? new Date(fromStr) : startOfMonth(new Date());
  const to = toStr ? new Date(toStr) : endOfMonth(new Date());

  // Aggregate paid payments in date range
  const payments = await db.payment.findMany({
    where: {
      status: "paid",
      createdAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      amount: true,
      discount: true,
      finalAmount: true,
      method: true,
      createdAt: true,
      appointment: {
        select: {
          service: { select: { id: true, name: true } },
        },
      },
    },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.finalAmount, 0);
  const totalDiscount = payments.reduce((sum, p) => sum + (p.discount || 0), 0);
  const totalCount = payments.length;

  // Group by method
  const byMethodMap = new Map<
    string,
    { method: string; count: number; total: number }
  >();
  for (const p of payments) {
    const entry = byMethodMap.get(p.method) || {
      method: p.method,
      count: 0,
      total: 0,
    };
    entry.count += 1;
    entry.total += p.finalAmount;
    byMethodMap.set(p.method, entry);
  }
  const byMethod = Array.from(byMethodMap.values()).sort((a, b) => b.total - a.total);

  // Group by day (gregorian YYYY-MM-DD) for chart
  const byDayMap = new Map<string, { date: string; total: number }>();
  for (const p of payments) {
    const d = p.createdAt;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    const entry = byDayMap.get(date) || { date, total: 0 };
    entry.total += p.finalAmount;
    byDayMap.set(date, entry);
  }
  const byDay = Array.from(byDayMap.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );

  // Top services (via appointment.service relation)
  const topServicesMap = new Map<
    string,
    { serviceName: string; count: number; total: number }
  >();
  for (const p of payments) {
    const svcName = p.appointment?.service?.name || "بدون خدمت";
    const key = p.appointment?.service?.id || "none";
    const entry = topServicesMap.get(key) || {
      serviceName: svcName,
      count: 0,
      total: 0,
    };
    entry.count += 1;
    entry.total += p.finalAmount;
    topServicesMap.set(key, entry);
  }
  const topServices = Array.from(topServicesMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return ok({
    from,
    to,
    totalCount,
    totalRevenue,
    totalDiscount,
    byMethod,
    byDay,
    topServices,
  });
});
