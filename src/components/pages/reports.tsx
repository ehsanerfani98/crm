"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useMemo, useEffect } from "react";
import {
  PageHeader, StatCard, Card, CardHeader, CardContent, EmptyState, LoadingState,
  ErrorState, useFetch, PersianDatePicker,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Receipt, CreditCard, Calendar as CalendarIcon,
} from "lucide-react";
import {
  formatNumber, formatCurrency, formatCurrencyCompact, toPersianDigits,
  formatDate, startOfMonth, endOfMonth, startOfWeek, endOfWeek, daysAgo,
} from "@/lib/persian";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type ReportData = {
  from: string;
  to: string;
  totalCount: number;
  totalRevenue: number;
  totalDiscount: number;
  byMethod: Array<{ method: string; count: number; total: number }>;
  byDay: Array<{ date: string; total: number }>;
  topServices: Array<{ serviceName: string; count: number; total: number }>;
};

const METHOD_LABEL: Record<string, string> = {
  cash: "نقدی", card: "کارت", transfer: "انتقال", online: "آنلاین",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "#0d9488", card: "#0ea5e9", transfer: "#8b5cf6", online: "#f59e0b",
};

const PIE_COLORS = ["#0d9488", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981"];

type Preset = "this_week" | "this_month" | "last_30" | "custom";

export function ReportsPage() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Apply presets
  useEffect(() => {
    const now = new Date();
    if (preset === "this_week") {
      setFrom(startOfWeek(now).toISOString());
      setTo(endOfWeek(now).toISOString());
    } else if (preset === "this_month") {
      setFrom(startOfMonth(now).toISOString());
      setTo(endOfMonth(now).toISOString());
    } else if (preset === "last_30") {
      setFrom(daysAgo(30, now).toISOString());
      setTo(now.toISOString());
    }
    // custom → keep empty
  }, [preset]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    return `/api/reports/financial?${sp.toString()}`;
  }, [from, to]);

  const { data, error, loading, refetch } = useFetch<ReportData>(query);

  const avgTransaction = data && data.totalCount > 0 ? Math.round(data.totalRevenue / data.totalCount) : 0;

  const byDayChart = useMemo(() => {
    if (!data) return [];
    return data.byDay.map((d) => ({
      name: formatDate(d.date).slice(5),
      value: d.total,
      fullDate: d.date,
    }));
  }, [data]);

  const byMethodChart = useMemo(() => {
    if (!data) return [];
    return data.byMethod.map((m) => ({
      name: METHOD_LABEL[m.method] || m.method,
      value: m.total,
      count: m.count,
      method: m.method,
    }));
  }, [data]);

  const topServicesChart = useMemo(() => {
    if (!data) return [];
    return data.topServices.map((s) => ({
      name: s.serviceName,
      value: s.total,
      count: s.count,
    }));
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="گزارش‌های مالی"
        subtitle="تحلیل درآمد و عملکرد مالی"
        icon={<BarChart3 className="size-5" />}
      />

      {/* Date range + presets */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant={preset === "this_week" ? "default" : "outline"} onClick={() => setPreset("this_week")}>این هفته</Button>
              <Button size="sm" variant={preset === "this_month" ? "default" : "outline"} onClick={() => setPreset("this_month")}>این ماه</Button>
              <Button size="sm" variant={preset === "last_30" ? "default" : "outline"} onClick={() => setPreset("last_30")}>۳۰ روز اخیر</Button>
              <Button size="sm" variant={preset === "custom" ? "default" : "outline"} onClick={() => setPreset("custom")}>دلخواه</Button>
            </div>
            {preset === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">از تاریخ</div>
                  <PersianDatePicker value={from} onChange={setFrom} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">تا تاریخ</div>
                  <PersianDatePicker value={to} onChange={setTo} />
                </div>
                <Button size="sm" onClick={refetch}><CalendarIcon className="size-4 ml-1" />اعمال</Button>
              </div>
            )}
            {preset !== "custom" && data && (
              <div className="text-xs text-muted-foreground">
                {formatDate(data.from)} تا {formatDate(data.to)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data ? (
        <EmptyState title="داده‌ای موجود نیست" />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="مجموع درآمد" value={formatCurrencyCompact(data.totalRevenue)} icon={<TrendingUp className="size-5" />} tone="success" />
            <StatCard label="مجموع تخفیف" value={formatCurrencyCompact(data.totalDiscount)} icon={<Receipt className="size-5" />} tone="warning" />
            <StatCard label="تعداد تراکنش‌ها" value={toPersianDigits(data.totalCount)} icon={<CreditCard className="size-5" />} tone="info" />
            <StatCard label="میانگین تراکنش" value={formatCurrencyCompact(avgTransaction)} icon={<BarChart3 className="size-5" />} tone="default" />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="درآمد به تفکیک روز" subtitle="روند درآمد در بازه انتخابی" />
              <CardContent className="p-2 sm:p-4">
                {byDayChart.every((d) => d.value === 0) ? (
                  <EmptyState title="داده‌ای برای نمایش نیست" />
                ) : (
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byDayChart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} width={40}
                          tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)} />
                        <Tooltip
                          formatter={(v: number) => [formatCurrency(v), "درآمد"]}
                          labelFormatter={(l) => formatDate(byDayChart.find((d) => d.name === l)?.fullDate || l)}
                          contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12, direction: "rtl" }}
                        />
                        <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="سهم روش‌های پرداخت" subtitle="توزیع درآمد بر اساس روش" />
              <CardContent className="p-2 sm:p-4">
                {byMethodChart.length === 0 ? (
                  <EmptyState title="داده‌ای موجود نیست" />
                ) : (
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byMethodChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => `${entry.name}`}>
                          {byMethodChart.map((entry, idx) => (
                            <Cell key={idx} fill={METHOD_COLORS[entry.method] || PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, _n, p) => [`${formatCurrency(v)} (${toPersianDigits((p?.payload as { count: number })?.count || 0)} تراکنش)`, ""]}
                          contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12, direction: "rtl" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, direction: "rtl" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top services */}
          <Card>
            <CardHeader title="پربازده‌ترین خدمات" subtitle="۱۰ خدمت برتر بر اساس درآمد" />
            <CardContent className="p-2 sm:p-4">
              {topServicesChart.length === 0 ? (
                <EmptyState title="داده‌ای موجود نیست" />
              ) : (
                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topServicesChart} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                      <XAxis type="number" stroke="#888" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)} />
                      <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={120} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(v: number, _n, p) => [`${formatCurrency(v)} (${toPersianDigits((p?.payload as { count: number })?.count || 0)} بار)`, "درآمد"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12, direction: "rtl" }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdown table */}
          <Card>
            <CardHeader title="جزئیات" subtitle={`گزارش روش‌های پرداخت`} />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium p-3">روش پرداخت</th>
                      <th className="text-right font-medium p-3">تعداد تراکنش</th>
                      <th className="text-right font-medium p-3">مجموع</th>
                      <th className="text-right font-medium p-3">سهم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {byMethodChart.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">داده‌ای موجود نیست</td></tr>
                    ) : byMethodChart.map((m) => {
                      const pct = data.totalRevenue > 0 ? Math.round((m.value / data.totalRevenue) * 100) : 0;
                      return (
                        <tr key={m.method}>
                          <td className="p-3 font-medium">{m.name}</td>
                          <td className="p-3 tabular">{toPersianDigits(m.count)}</td>
                          <td className="p-3 tabular">{formatNumber(m.value)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: METHOD_COLORS[m.method] || "#0d9488" }} />
                              </div>
                              <span className="text-xs tabular text-muted-foreground">{toPersianDigits(pct)}٪</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
