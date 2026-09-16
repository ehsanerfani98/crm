"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from "react";
import {
  PageHeader, StatCard, Card, CardContent, SearchInput, EmptyState, LoadingState,
  ErrorState, StatusBadge, FormField, useFetch, apiPost,
  PersianDatePicker,
} from "@/components/common";
import { useNav, useAuthStore } from "@/lib/store";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Wallet, Plus, Filter, BarChart3, Calendar as CalendarIcon,
} from "lucide-react";
import {
  formatNumber, formatCurrency, formatCurrencyCompact, toPersianDigits,
  formatRelativeTime, formatDate, startOfMonth, endOfMonth, startOfDay, endOfDay,
} from "@/lib/persian";
import { toast } from "sonner";

// Radix Select forbids an empty-string item value (it is reserved to clear the
// selection and show the placeholder), so we use a non-empty sentinel and map
// it back to "" at the Select boundary.
const NONE_VALUE = "__none__";

type Payment = {
  id: string;
  amount: number;
  discount: number;
  finalAmount: number;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  patient: { id: string; code: string; firstName: string; lastName: string; mobile?: string | null };
  appointment?: { id: string; startAt: string } | null;
  receivedBy?: { id: string; name: string } | null;
};

type ListResp = {
  items: Payment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: { totalRevenue: number; totalDiscount: number; totalAmount: number };
};

type ApptOpt = { id: string; startAt: string; service?: { id: string; name: string } | null };

const METHODS = [
  { value: "cash", label: "نقدی" },
  { value: "card", label: "کارت" },
  { value: "transfer", label: "انتقال" },
  { value: "online", label: "آنلاین" },
];

const PAY_STATUSES = [
  { value: "paid", label: "پرداخت شده" },
  { value: "pending", label: "در انتظار" },
  { value: "refunded", label: "بازگشت داده شده" },
];

export function FinancialPage() {
  const params = useNav((s) => s.params);
  const setPage = useNav((s) => s.setPage);
  const user = useAuthStore((s) => s.user);

  // Filters
  const [patientId, setPatientId] = useState((params.patientId as string) || "all");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPageNum] = useState(1);

  // Patient autocomplete (for filter and form)
  const [patientQ, setPatientQ] = useState("");
  const [patientResults, setPatientResults] = useState<Array<{ id: string; firstName: string; lastName: string; code: string }>>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; firstName: string; lastName: string; code: string } | null>(null);

  // Form
  const [formOpen, setFormOpen] = useState(!!params.new);

  const canCreate = hasPermission(user, "financial.create");

  // Compute today & month stats via reports/financial endpoint
  const todayQ = useMemo(() => {
    const s = startOfDay(new Date()).toISOString();
    const e = endOfDay(new Date()).toISOString();
    return `/api/reports/financial?from=${s}&to=${e}`;
  }, []);
  const monthQ = useMemo(() => {
    const s = startOfMonth(new Date()).toISOString();
    const e = endOfMonth(new Date()).toISOString();
    return `/api/reports/financial?from=${s}&to=${e}`;
  }, []);
  const { data: todayData } = useFetch<{ totalRevenue: number; totalCount: number }>(todayQ);
  const { data: monthData } = useFetch<{ totalRevenue: number; totalCount: number; totalDiscount: number }>(monthQ);

  // Pre-fill patient when navigated from patient-detail
  useEffect(() => {
    if (params.patientId) {
      // Try to fetch patient details to populate selectedPatient
      fetch(`/api/patients?q=&status=all&page=1&pageSize=1000`)
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            const found = (j.data.items as Array<{ id: string; firstName: string; lastName: string; code: string }>).find((p) => p.id === params.patientId);
            if (found) {
              setSelectedPatient(found);
              setPatientId(found.id);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // List query
  const listQuery = useMemo(() => {
    const sp = new URLSearchParams({
      method, status,
      page: String(page), pageSize: "20",
    });
    if (patientId && patientId !== "all") sp.set("patientId", patientId);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    return `/api/payments?${sp.toString()}`;
  }, [patientId, method, status, from, to, page]);

  const { data, error, loading, refetch } = useFetch<ListResp>(listQuery);

  useEffect(() => {
    if (!patientQ.trim()) { setPatientResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(patientQ)}&status=all&page=1&pageSize=10`)
        .then((r) => r.json())
        .then((j) => { if (j.ok) setPatientResults(j.data.items); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientQ]);

  const monthAvg = monthData && monthData.totalCount > 0 ? Math.round(monthData.totalRevenue / monthData.totalCount) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="مالی"
        subtitle="مدیریت پرداخت‌ها و گزارش‌های مالی"
        icon={<Wallet className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setPage("reports")}>
              <BarChart3 className="size-4 ml-1" />
              گزارش مالی
            </Button>
            {canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="size-4 ml-1" />ثبت پرداخت</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="درآمد امروز" value={formatCurrencyCompact(todayData?.totalRevenue || 0)} icon={<Wallet className="size-5" />} tone="success" />
        <StatCard label="درآمد این ماه" value={formatCurrencyCompact(monthData?.totalRevenue || 0)} icon={<BarChart3 className="size-5" />} tone="default" />
        <StatCard label="پرداخت‌های این ماه" value={toPersianDigits(monthData?.totalCount || 0)} icon={<CalendarIcon className="size-5" />} tone="info" />
        <StatCard label="میانگین پرداخت" value={formatCurrencyCompact(monthAvg)} icon={<BarChart3 className="size-5" />} tone="default" hint="این ماه" />
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            {/* Patient filter as autocomplete */}
            <div className="flex-1 min-w-[200px]">
              {selectedPatient ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-input bg-background h-9">
                  <Avatar className="size-6"><AvatarFallback className="bg-primary/10 text-primary text-xs">{selectedPatient.firstName.charAt(0)}{selectedPatient.lastName.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0 text-sm truncate">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSelectedPatient(null); setPatientId("all"); }}>✕</button>
                </div>
              ) : (
                <SearchInput value={patientQ} onChange={setPatientQ} placeholder="فیلتر بر اساس مراجع…" />
              )}
              {patientResults.length > 0 && (
                <div className="border border-border rounded-md mt-1 max-h-40 overflow-y-auto custom-scroll divide-y divide-border/60 z-10 bg-card relative">
                  {patientResults.map((p) => (
                    <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setPatientId(p.id); setPageNum(1); setPatientQ(""); setPatientResults([]); }} className="w-full flex items-center gap-2 p-2 hover:bg-muted/40 text-right">
                      <Avatar className="size-7"><AvatarFallback className="bg-primary/10 text-primary text-xs">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{p.firstName} {p.lastName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{toPersianDigits(p.code)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select value={method} onValueChange={(v) => { setMethod(v); setPageNum(1); }}>
              <SelectTrigger className="sm:w-32 bg-background"><Filter className="size-4 ml-1 text-muted-foreground" /><SelectValue placeholder="روش" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه روش‌ها</SelectItem>
                {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPageNum(1); }}>
              <SelectTrigger className="sm:w-36 bg-background"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {PAY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <PersianDatePicker value={from} onChange={(v) => { setFrom(v); setPageNum(1); }} placeholder="از تاریخ" />
              <PersianDatePicker value={to} onChange={(v) => { setTo(v); setPageNum(1); }} placeholder="تا تاریخ" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState rows={6} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState title="پرداختی یافت نشد" icon={<Wallet className="size-7" />} action={canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="size-4 ml-1" />ثبت پرداخت</Button>} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium p-3">تاریخ</th>
                      <th className="text-right font-medium p-3">مراجع</th>
                      <th className="text-right font-medium p-3">مبلغ</th>
                      <th className="text-right font-medium p-3">تخفیف</th>
                      <th className="text-right font-medium p-3">مبلغ نهایی</th>
                      <th className="text-right font-medium p-3">روش</th>
                      <th className="text-right font-medium p-3">وضعیت</th>
                      <th className="text-right font-medium p-3">مرجع</th>
                      <th className="text-right font-medium p-3">دریافت‌کننده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.items.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setPage("patient-detail", { id: p.patient.id })}>
                        <td className="p-3 text-xs">{formatDate(p.createdAt, true)}</td>
                        <td className="p-3 font-medium">{p.patient.firstName} {p.patient.lastName}</td>
                        <td className="p-3 tabular">{formatNumber(p.amount)}</td>
                        <td className="p-3 tabular text-rose-600">{p.discount ? formatNumber(p.discount) : "—"}</td>
                        <td className="p-3 tabular font-semibold">{formatNumber(p.finalAmount)}</td>
                        <td className="p-3"><StatusBadge status={p.method} /></td>
                        <td className="p-3"><StatusBadge status={p.status} /></td>
                        <td className="p-3 text-xs text-muted-foreground font-mono" >{p.reference ? toPersianDigits(p.reference) : "—"}</td>
                        <td className="p-3 text-muted-foreground text-xs">{p.receivedBy?.name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border/60">
                {data.items.map((p) => (
                  <div key={p.id} className="p-3" onClick={() => setPage("patient-detail", { id: p.patient.id })}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm">{p.patient.firstName} {p.patient.lastName}</div>
                        <div className="text-xs text-muted-foreground">{formatRelativeTime(p.createdAt)}</div>
                      </div>
                      <div className="font-bold">{formatCurrency(p.finalAmount)}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                      <StatusBadge status={p.method} />
                      <StatusBadge status={p.status} />
                      {p.discount > 0 && <span className="text-rose-600">تخفیف: {formatNumber(p.discount)}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border/60 text-sm">
                  <div className="text-muted-foreground text-xs">
                    {toPersianDigits((page - 1) * data.pageSize + 1)} تا {toPersianDigits(Math.min(page * data.pageSize, data.total))} از {toPersianDigits(data.total)}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPageNum((p) => p - 1)}>قبلی</Button>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPageNum((p) => p + 1)}>بعدی</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        prefillPatientId={(params.patientId as string) || undefined}
        prefillPatient={selectedPatient}
        onSaved={() => { setFormOpen(false); refetch(); }}
      />
    </div>
  );
}

// ---------------- PaymentFormDialog ----------------

function PaymentFormDialog({
  open, onOpenChange, prefillPatientId, prefillPatient, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefillPatientId?: string;
  prefillPatient?: { id: string; firstName: string; lastName: string; code: string } | null;
  onSaved: () => void;
}) {
  const [patientQ, setPatientQ] = useState("");
  const [patientResults, setPatientResults] = useState<Array<{ id: string; firstName: string; lastName: string; code: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; firstName: string; lastName: string; code: string } | null>(null);

  const [appts, setAppts] = useState<ApptOpt[]>([]);
  const [form, setForm] = useState({
    appointmentId: "", amount: 0, discount: 0, finalAmount: 0,
    method: "cash", status: "paid", reference: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ appointmentId: "", amount: 0, discount: 0, finalAmount: 0, method: "cash", status: "paid", reference: "", notes: "" });
      setErrors({});
      if (prefillPatient) {
        setSelectedPatient(prefillPatient);
        setForm((f) => ({ ...f, appointmentId: "" }));
      } else if (prefillPatientId) {
        fetch(`/api/patients?q=&status=all&page=1&pageSize=1000`)
          .then((r) => r.json())
          .then((j) => {
            if (j.ok) {
              const found = (j.data.items as Array<{ id: string; firstName: string; lastName: string; code: string }>).find((p) => p.id === prefillPatientId);
              if (found) setSelectedPatient(found);
            }
          }).catch(() => {});
      } else {
        setSelectedPatient(null);
      }
      setAppts([]); setPatientQ(""); setPatientResults([]);
    }
  }, [open, prefillPatient, prefillPatientId]);

  // Debounced patient search
  useEffect(() => {
    if (!patientQ.trim()) { setPatientResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(patientQ)}&status=all&page=1&pageSize=20`)
        .then((r) => r.json())
        .then((j) => { if (j.ok) setPatientResults(j.data.items); })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [patientQ]);

  // Load appointments when patient selected
  useEffect(() => {
    if (!selectedPatient) { setAppts([]); return; }
    fetch(`/api/appointments?view=calendar&patientId=${selectedPatient.id}&from=2000-01-01&to=2100-01-01`)
      .then((r) => r.json())
      .then((j) => { if (j.ok) setAppts(j.data.items as ApptOpt[]); })
      .catch(() => setAppts([]));
  }, [selectedPatient]);

  const finalAmount = Math.max(0, Number(form.amount) - Number(form.discount));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) { setErrors({ patientId: "انتخاب مراجع الزامی است." }); return; }
    setSaving(true); setErrors({});
    const res = await apiPost("/api/payments", {
      patientId: selectedPatient.id,
      appointmentId: form.appointmentId || undefined,
      amount: Number(form.amount),
      discount: Number(form.discount),
      finalAmount,
      method: form.method,
      status: form.status,
      reference: form.reference,
      notes: form.notes,
    });
    if (res.ok) {
      toast.success("پرداخت با موفقیت ثبت شد.");
      onSaved();
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      toast.error(res.error || "خطا در ثبت پرداخت.");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>ثبت پرداخت</DialogTitle>
          <DialogDescription>اطلاعات پرداخت را وارد کنید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="مراجع" required error={errors.patientId}>
            {selectedPatient ? (
              <div className="flex items-center gap-2 p-2 rounded-md border border-input bg-background">
                <Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{selectedPatient.firstName.charAt(0)}{selectedPatient.lastName.charAt(0)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{toPersianDigits(selectedPatient.code)}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>تغییر</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="جستجوی مراجع…" className="bg-background" />
                {searching && <div className="text-xs text-muted-foreground">در حال جستجو…</div>}
                {patientResults.length > 0 && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto custom-scroll divide-y divide-border/60">
                    {patientResults.map((p) => (
                      <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setPatientQ(""); setPatientResults([]); }} className="w-full flex items-center gap-2 p-2 hover:bg-muted/40 text-right">
                        <Avatar className="size-7"><AvatarFallback className="bg-primary/10 text-primary text-xs">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0"><div className="text-sm truncate">{p.firstName} {p.lastName}</div><div className="text-xs text-muted-foreground font-mono">{toPersianDigits(p.code)}</div></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FormField>

          {selectedPatient && appts.length > 0 && (
            <FormField label="نوبت مرتبط (اختیاری)">
              <Select value={form.appointmentId || NONE_VALUE} onValueChange={(v) => setForm({ ...form, appointmentId: v === NONE_VALUE ? "" : v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue placeholder="بدون نوبت" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>بدون نوبت</SelectItem>
                  {appts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{formatDate(a.startAt)} {a.service?.name ? `— ${a.service.name}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="مبلغ (تومان)" required error={errors.amount}>
              <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} min={0} />
            </FormField>
            <FormField label="تخفیف (تومان)">
              <Input type="number" value={form.discount || ""} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} min={0} />
            </FormField>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">مبلغ نهایی</span>
            <span className="font-bold tabular">{toPersianDigits(finalAmount.toLocaleString("en-US"))} تومان</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="روش پرداخت" required>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="وضعیت">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="شماره مرجع">
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}  className="text-left" placeholder="کد تراکنش…" />
          </FormField>

          <FormField label="یادداشت">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ثبت…" : "ثبت پرداخت"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
