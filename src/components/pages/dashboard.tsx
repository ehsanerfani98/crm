"use client";

import { useFetch } from "@/components/common";
import { PageHeader, StatCard, Card, CardHeader, CardContent, EmptyState, LoadingState } from "@/components/common";
import { useNav } from "@/lib/store";
import {
  CalendarDays, Users, Wallet, CheckSquare, UserPlus, Bell,
  Clock, TrendingUp, AlertCircle,
} from "lucide-react";
import {
  formatNumber, formatCurrency, formatCurrencyCompact, formatTime, formatRelativeTime,
  toPersianDigits, formatDate, todayLong,
} from "@/lib/persian";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { StatusBadge } from "@/components/common";

type DashboardData = {
  stats: {
    todayAppointments: number;
    upcomingCount: number;
    todayNewPatients: number;
    todayRevenue: number;
    monthRevenue: number;
    pendingTasks: number;
    overdueTasks: number;
    openLeads: number;
  };
  upcomingAppointments: Array<{
    id: string;
    startAt: string;
    endAt?: string;
    status: string;
    price?: number;
    patient: { id: string; name: string; mobile?: string };
    doctor?: { id: string; name: string } | null;
    service?: { id: string; name: string } | null;
  }>;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  paymentsLast7Days: Array<{ date: string; total: number }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: string;
    user?: string;
    patient?: string | null;
  }>;
};

export function DashboardPage() {
  const { data, error, loading } = useFetch<DashboardData>("/api/dashboard");
  const setPage = useNav((s) => s.setPage);

  if (loading) return <LoadingState rows={6} />;
  if (error || !data) return <EmptyState title="خطا در بارگذاری داشبورد" description={error || undefined} />;

  const { stats, upcomingAppointments, paymentsLast7Days, recentActivities } = data;

  const chartData = paymentsLast7Days.map((p) => ({
    name: formatDate(p.date).slice(5),
    value: p.total,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="خوش آمدید 👋"
        subtitle={todayLong()}
        icon={<CalendarDays className="size-5" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="نوبت‌های امروز"
          value={toPersianDigits(stats.todayAppointments)}
          icon={<CalendarDays className="size-5" />}
          tone="info"
          hint={`${toPersianDigits(stats.upcomingCount)} نوبت پیش رو`}
        />
        <StatCard
          label="مراجعین جدید امروز"
          value={toPersianDigits(stats.todayNewPatients)}
          icon={<Users className="size-5" />}
          tone="success"
        />
        <StatCard
          label="درآمد امروز"
          value={formatCurrencyCompact(stats.todayRevenue)}
          icon={<Wallet className="size-5" />}
          tone="default"
          hint={`این ماه: ${formatCurrencyCompact(stats.monthRevenue)}`}
        />
        <StatCard
          label="وظایف معوق"
          value={toPersianDigits(stats.overdueTasks)}
          icon={<AlertCircle className="size-5" />}
          tone={stats.overdueTasks > 0 ? "destructive" : "default"}
          hint={`${toPersianDigits(stats.pendingTasks)} وظیفه فعال`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="درآمد ۷ روز اخیر"
            subtitle="مجموع پرداخت‌های روزانه (تومان)"
            action={
              <button onClick={() => setPage("reports")} className="text-xs text-primary hover:underline">
                گزارش کامل ←
              </button>
            }
          />
          <CardContent className="p-2 sm:p-4">
            {chartData.every((d) => d.value === 0) ? (
              <EmptyState title="داده‌ای برای نمایش وجود ندارد" description="هنوز پرداختی ثبت نشده است." />
            ) : (
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} width={40}
                      tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)} />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), "درآمد"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12, direction: "rtl" }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="نوبت‌های پیش رو"
            subtitle="نزدیک‌ترین نوبت‌ها"
            action={
              <button onClick={() => setPage("appointments")} className="text-xs text-primary hover:underline">
                همه ←
              </button>
            }
          />
          <CardContent className="p-2">
            {upcomingAppointments.length === 0 ? (
              <EmptyState title="نوبتی پیش رو نیست" icon={<Clock className="size-6" />} />
            ) : (
              <ul className="divide-y divide-border/60">
                {upcomingAppointments.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 py-2.5 px-2 cursor-pointer hover:bg-muted/40 rounded-lg"
                    onClick={() => setPage("appointments", { id: a.id })}
                  >
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center text-xs leading-tight font-semibold">
                      {formatTime(a.startAt).slice(0, 5)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{a.patient.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.service?.name || "خدمت"}
                        {a.doctor && ` • ${a.doctor.name}`}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "مراجع جدید", icon: <Users className="size-5" />, action: () => setPage("patients", { new: "1" }), color: "bg-emerald-500/10 text-emerald-600" },
          { label: "نوبت جدید", icon: <CalendarDays className="size-5" />, action: () => setPage("appointments", { new: "1" }), color: "bg-sky-500/10 text-sky-600" },
          { label: "ثبت لید", icon: <UserPlus className="size-5" />, action: () => setPage("leads", { new: "1" }), color: "bg-violet-500/10 text-violet-600" },
          { label: "ثبت پرداخت", icon: <Wallet className="size-5" />, action: () => setPage("financial", { new: "1" }), color: "bg-amber-500/10 text-amber-600" },
        ].map((qa) => (
          <button
            key={qa.label}
            onClick={qa.action}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/70 hover:shadow-sm transition text-right"
          >
            <div className={`size-10 rounded-xl flex items-center justify-center ${qa.color}`}>
              {qa.icon}
            </div>
            <span className="font-medium text-sm">{qa.label}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title="آخرین فعالیت‌ها" subtitle="رویدادهای اخیر سیستم" />
        <CardContent className="p-2">
          {recentActivities.length === 0 ? (
            <EmptyState title="فعالیتی ثبت نشده است" />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentActivities.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5 px-2">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                    <Bell className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.user && `${a.user} • `}
                      {formatRelativeTime(a.createdAt)}
                      {a.patient && ` • ${a.patient}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
