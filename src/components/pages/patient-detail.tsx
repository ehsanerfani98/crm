"use client";

import { useState, useEffect } from "react";
import {
  PageHeader, StatCard, Card, CardHeader, CardContent, EmptyState,
  LoadingState, ErrorState, StatusBadge, FormField, useFetch, apiPost,
} from "@/components/common";
import { useNav, useAuthStore } from "@/lib/store";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  ArrowRight, CalendarDays, Wallet, Receipt, Clock, Phone, MapPin,
  User as UserIcon, ClipboardList, StickyNote, FileText,
} from "lucide-react";
import {
  formatNumber, formatCurrency, toPersianDigits, formatRelativeTime,
  formatDate, formatTime, formatDateLong,
} from "@/lib/persian";
import { toast } from "sonner";

type Patient = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  phone: string | null;
  nationalId: string | null;
  gender: string | null;
  birthDate: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  status: string;
  source: string | null;
  createdAt: string;
  lastVisitAt: string | null;
  _count?: { appointments: number; payments: number; notes: number };
};

type TimelineEntry = {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  meta?: Record<string, unknown>;
  user?: string;
};

type ApptItem = {
  id: string;
  startAt: string;
  endAt?: string | null;
  status: string;
  price?: number | null;
  notes?: string | null;
  doctor?: { id: string; fullName: string } | null;
  service?: { id: string; name: string } | null;
};

type PaymentItem = {
  id: string;
  amount: number;
  discount: number;
  finalAmount: number;
  method: string;
  status: string;
  reference: string | null;
  createdAt: string;
};

type NoteItem = {
  id: string;
  content: string;
  createdAt: string;
  author?: { name: string } | null;
};

type TimelineResp = {
  timeline: TimelineEntry[];
  appointments: ApptItem[];
  payments: PaymentItem[];
  notes: NoteItem[];
  balance: number;
  totalPaid: number;
  totalBilled: number;
};

const STATUS_LABELS: Record<string, string> = {
  appointment: "نوبت",
  payment: "پرداخت",
  note: "یادداشت",
  status: "وضعیت",
  call: "تماس",
  message: "پیام",
  other: "سایر",
};

export function PatientDetailPage() {
  const params = useNav((s) => s.params);
  const setPage = useNav((s) => s.setPage);
  const user = useAuthStore((s) => s.user);
  const id = params.id as string;

  const { data: patientData, error: pErr, loading: pLoading, refetch: refetchPatient } =
    useFetch<{ patient: Patient }>(id ? `/api/patients/${id}` : null);
  const { data: tl, error: tErr, loading: tLoading, refetch: refetchTimeline } =
    useFetch<TimelineResp>(id ? `/api/patients/${id}/timeline` : null);

  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const canUpdate = hasPermission(user, "patients.update");
  const canCreateAppt = hasPermission(user, "appointments.create");
  const canCreatePay = hasPermission(user, "financial.create");

  if (pLoading || tLoading) return <LoadingState rows={6} />;
  if (pErr || tErr) return <ErrorState message={pErr || tErr || "خطا"} onRetry={() => { refetchPatient(); refetchTimeline(); }} />;
  if (!patientData || !tl) return <EmptyState title="مراجع یافت نشد" />;

  const p = patientData.patient;
  const fullName = `${p.firstName} ${p.lastName}`;

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSavingNote(true);
    const res = await apiPost<{ note: NoteItem }>(`/api/patients/${id}/notes`, { content: newNote });
    if (res.ok) {
      toast.success("یادداشت ثبت شد.");
      setNewNote("");
      refetchTimeline();
    } else {
      toast.error(res.error || "خطا در ثبت یادداشت.");
    }
    setSavingNote(false);
  }

  return (
    <div className="space-y-5">
      {/* Top: back + header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPage("patients")}>
          <ArrowRight className="size-4 ml-1" />
          بازگشت
        </Button>
      </div>

      <PageHeader
        title={fullName}
        subtitle={`کد پرونده: ${toPersianDigits(p.code)}`}
        icon={<UserIcon className="size-5" />}
        actions={
          <>
            <StatusBadge status={p.status} />
            {canCreateAppt && (
              <Button size="sm" onClick={() => setPage("appointments", { new: "1", patientId: p.id })}>
                <CalendarDays className="size-4 ml-1" />
                نوبت جدید
              </Button>
            )}
            {canCreatePay && (
              <Button size="sm" variant="outline" onClick={() => setPage("financial", { new: "1", patientId: p.id })}>
                <Wallet className="size-4 ml-1" />
                ثبت پرداخت
              </Button>
            )}
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="تعداد نوبت‌ها"
          value={toPersianDigits(p._count?.appointments ?? tl.appointments.length)}
          icon={<CalendarDays className="size-5" />}
          tone="info"
        />
        <StatCard
          label="مجموع پرداختی"
          value={formatCurrency(tl.totalPaid)}
          icon={<Wallet className="size-5" />}
          tone="success"
        />
        <StatCard
          label="بدهی"
          value={formatCurrency(tl.balance)}
          icon={<Receipt className="size-5" />}
          tone={tl.balance > 0 ? "destructive" : "default"}
          hint={tl.balance < 0 ? "اعتبار" : undefined}
        />
        <StatCard
          label="آخرین مراجعه"
          value={p.lastVisitAt ? formatRelativeTime(p.lastVisitAt) : "—"}
          icon={<Clock className="size-5" />}
          tone="default"
        />
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Right: info */}
        <Card className="lg:col-span-1">
          <CardHeader title="اطلاعات مراجع" subtitle={toPersianDigits(p.code)} />
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={<UserIcon className="size-4" />} label="نام کامل" value={fullName} />
            <InfoRow
              icon={<Phone className="size-4" />}
              label="موبایل"
              value={p.mobile ? toPersianDigits(p.mobile) : "—"}
              ltr
            />
            <InfoRow
              icon={<Phone className="size-4" />}
              label="تلفن"
              value={p.phone ? toPersianDigits(p.phone) : "—"}
              ltr
            />
            <InfoRow
              icon={<FileText className="size-4" />}
              label="کد ملی"
              value={p.nationalId ? toPersianDigits(p.nationalId) : "—"}
              ltr
            />
            <InfoRow
              icon={<UserIcon className="size-4" />}
              label="جنسیت"
              value={p.gender ? <StatusBadge status={p.gender} /> : "—"}
            />
            <InfoRow
              icon={<CalendarDays className="size-4" />}
              label="تاریخ تولد"
              value={p.birthDate ? formatDate(p.birthDate) : "—"}
            />
            <InfoRow
              icon={<MapPin className="size-4" />}
              label="آدرس"
              value={p.address || "—"}
            />
            <InfoRow
              icon={<ClipboardList className="size-4" />}
              label="منبع"
              value={p.source ? <StatusBadge status={p.source} /> : "—"}
            />
            <InfoRow
              icon={<Clock className="size-4" />}
              label="تاریخ ایجاد"
              value={formatDate(p.createdAt)}
            />
            {p.description && (
              <div className="pt-2 border-t border-border/60">
                <div className="text-xs text-muted-foreground mb-1">توضیحات</div>
                <p className="text-sm leading-6">{p.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Left: timeline */}
        <Card className="lg:col-span-2">
          <CardHeader title="خط زمانی" subtitle="آخرین رویدادهای پرونده" />
          <CardContent className="p-2 sm:p-4">
            {tl.timeline.length === 0 ? (
              <EmptyState title="رویدادی ثبت نشده است" icon={<Clock className="size-6" />} />
            ) : (
              <ol className="relative">
                {tl.timeline.slice(0, 30).map((e) => (
                  <li key={e.id} className="flex gap-3 pb-4 border-b border-border/40 last:border-0">
                    <div className="flex flex-col items-center">
                      <span className={`size-8 rounded-full flex items-center justify-center shrink-0 ${typeColor(e.type)}`}>
                        {typeIcon(e.type)}
                      </span>
                      <span className="flex-1 w-px bg-border/60 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{e.title}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(e.createdAt)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {STATUS_LABELS[e.type] || e.type}
                        {e.user && ` • ${e.user}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add note */}
      <Card>
        <CardHeader title="افزودن یادداشت" subtitle="یادداشت داخلی روی پرونده مراجع" />
        <CardContent>
          <form onSubmit={handleAddNote} className="space-y-3">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="متن یادداشت…"
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={savingNote || !newNote.trim() || !canUpdate}>
                <StickyNote className="size-4 ml-1" />
                {savingNote ? "در حال ثبت…" : "ثبت یادداشت"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="appointments">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="appointments">
            <CalendarDays className="size-4 ml-1" />
            نوبت‌ها ({toPersianDigits(tl.appointments.length)})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Wallet className="size-4 ml-1" />
            پرداخت‌ها ({toPersianDigits(tl.payments.length)})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="size-4 ml-1" />
            یادداشت‌ها ({toPersianDigits(tl.notes.length)})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="size-4 ml-1" />
            خط زمانی
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <Card>
            <CardContent className="p-0">
              {tl.appointments.length === 0 ? (
                <EmptyState title="نوبتی ثبت نشده است" icon={<CalendarDays className="size-6" />} />
              ) : (
                <div className="divide-y divide-border/60">
                  {tl.appointments.map((a) => (
                    <div key={a.id} className="p-3 sm:p-4 flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center text-xs font-semibold shrink-0">
                        {formatTime(a.startAt).slice(0, 5)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {a.service?.name || "خدمت"}
                          {a.doctor && ` • ${a.doctor.fullName}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDateLong(a.startAt)}
                          {a.price ? ` • ${formatCurrency(a.price)}` : ""}
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {tl.payments.length === 0 ? (
                <EmptyState title="پرداختی ثبت نشده است" icon={<Wallet className="size-6" />} />
              ) : (
                <div className="divide-y divide-border/60">
                  {tl.payments.map((pay) => (
                    <div key={pay.id} className="p-3 sm:p-4 flex items-center gap-3">
                      <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <Wallet className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {formatCurrency(pay.finalAmount)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(pay.createdAt, true)}
                          {pay.reference && ` • réf: ${toPersianDigits(pay.reference)}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={pay.method} />
                        <StatusBadge status={pay.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-0">
              {tl.notes.length === 0 ? (
                <EmptyState title="یادداشتی ثبت نشده است" icon={<StickyNote className="size-6" />} />
              ) : (
                <div className="divide-y divide-border/60">
                  {tl.notes.map((n) => (
                    <div key={n.id} className="p-3 sm:p-4">
                      <p className="text-sm leading-6 whitespace-pre-wrap">{n.content}</p>
                      <div className="text-xs text-muted-foreground mt-2">
                        {n.author?.name || "—"} • {formatRelativeTime(n.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-2 sm:p-4">
              {tl.timeline.length === 0 ? (
                <EmptyState title="رویدادی ثبت نشده است" />
              ) : (
                <ol className="relative">
                  {tl.timeline.map((e) => (
                    <li key={e.id} className="flex gap-3 pb-3 border-b border-border/40 last:border-0">
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${typeColor(e.type)}`}>
                        {typeIcon(e.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{e.title}</p>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(e.createdAt)}
                          {e.user && ` • ${e.user}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  icon, label, value, ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium mt-0.5" dir={ltr ? "ltr" : undefined}>{value}</div>
      </div>
    </div>
  );
}

function typeColor(type: string): string {
  switch (type) {
    case "appointment": return "bg-sky-500/10 text-sky-600";
    case "payment": return "bg-emerald-500/10 text-emerald-600";
    case "note": return "bg-amber-500/10 text-amber-600";
    case "status": return "bg-violet-500/10 text-violet-600";
    default: return "bg-muted text-muted-foreground";
  }
}

function typeIcon(type: string): React.ReactNode {
  switch (type) {
    case "appointment": return <CalendarDays className="size-4" />;
    case "payment": return <Wallet className="size-4" />;
    case "note": return <StickyNote className="size-4" />;
    default: return <Clock className="size-4" />;
  }
}
