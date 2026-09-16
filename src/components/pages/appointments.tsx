"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from "react";
import {
  PageHeader, Card, CardContent, SearchInput, EmptyState, LoadingState,
  ErrorState, ConfirmDialog, StatusBadge, FormField, useFetch,
  apiPost, apiPut, apiDelete, PersianDateTimePicker,
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays, Plus, Filter, MoreVertical, Trash2, Edit,
  ChevronRight, ChevronLeft, Clock, User as UserIcon,
} from "lucide-react";
import {
  formatNumber, formatCurrency, toPersianDigits, formatRelativeTime,
  formatDate, formatTime, formatDateLong,
  toJalali, fromJalali, persianWeekday, PERSIAN_MONTHS, PERSIAN_WEEKDAYS_SHORT,
  startOfMonth, endOfMonth, startOfDay, endOfDay,
} from "@/lib/persian";
import { toast } from "sonner";
import { jalaaliMonthLength } from "jalaali-js";

type Appt = {
  id: string;
  startAt: string;
  endAt?: string | null;
  status: string;
  price?: number | null;
  notes?: string | null;
  durationMin?: number | null;
  patient: { id: string; firstName: string; lastName: string; code: string; mobile?: string | null };
  doctor?: { id: string; fullName: string; color?: string | null } | null;
  service?: { id: string; name: string; price?: number; durationMin?: number } | null;
};

type ListResp = {
  items: Appt[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type CalResp = { items: Appt[]; from: string; to: string };

type PatientOpt = { id: string; firstName: string; lastName: string; code: string };
type StaffOpt = { id: string; fullName: string; type: string };
type ServiceOpt = { id: string; name: string; price: number; durationMin: number };

const APPT_STATUSES = [
  { value: "booked", label: "رزرو شده" },
  { value: "confirmed", label: "تأیید شده" },
  { value: "waiting", label: "در انتظار" },
  { value: "in_progress", label: "در حال مراجعه" },
  { value: "done", label: "انجام شده" },
  { value: "cancelled", label: "لغو شده" },
  { value: "no_show", label: "عدم مراجعه" },
];

export function AppointmentsPage() {
  const params = useNav((s) => s.params);
  const setPage = useNav((s) => s.setPage);
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState<"list" | "calendar">("calendar");

  // List filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [doctorId, setDoctorId] = useState("all");
  const [page, setPageNum] = useState(1);

  // Calendar state
  const today = new Date();
  const todayJ = toJalali(today);
  const [calYear, setCalYear] = useState(todayJ.jy);
  const [calMonth, setCalMonth] = useState(todayJ.jm);

  // Form state
  const [formOpen, setFormOpen] = useState(!!params.new);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Appt | null>(null);
  const [dayModal, setDayModal] = useState<{ date: Date; items: Appt[] } | null>(null);

  const canCreate = hasPermission(user, "appointments.create");
  const canUpdate = hasPermission(user, "appointments.update");
  const canDelete = hasPermission(user, "appointments.delete");

  // Debounced search
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPageNum(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // Open appointment detail if id param is set
  useEffect(() => {
    if (params.id) {
      // Fetch appointment detail and open edit dialog
      fetch(`/api/appointments?view=calendar&from=${startOfMonth(new Date()).toISOString()}&to=${endOfMonth(new Date()).toISOString()}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            const a = (j.data as CalResp).items.find((x: Appt) => x.id === params.id);
            if (a) { setEditing(a); setFormOpen(true); }
          }
        })
        .catch(() => {});
    }
  }, [params.id]);

  // Pre-fill patient when navigated from patient-detail
  useEffect(() => {
    if (params.patientId && params.new) {
      setFormOpen(true);
    }
  }, []);

  // Doctors list (for filter + form)
  const { data: staffData } = useFetch<{ items: StaffOpt[] }>(`/api/staff?type=doctor`);
  const { data: servicesData } = useFetch<{ items: ServiceOpt[] }>(`/api/services?status=active`);

  // Build list query
  const listQuery = useMemo(() => {
    const sp = new URLSearchParams({
      q: debouncedQ,
      status,
      doctorId,
      page: String(page),
      pageSize: "20",
    });
    return `/api/appointments?${sp.toString()}`;
  }, [debouncedQ, status, doctorId, page]);

  const { data: listData, error: listErr, loading: listLoading, refetch: refetchList } =
    useFetch<ListResp>(view === "list" ? listQuery : null);

  // Calendar query (whole month)
  const calQuery = useMemo(() => {
    const start = startOfMonth(fromJalali(calYear, calMonth, 1));
    const end = endOfMonth(fromJalali(calYear, calMonth, 1));
    // Add a few days before/after for the visible grid
    const from = new Date(start);
    from.setDate(from.getDate() - 7);
    const to = new Date(end);
    to.setDate(to.getDate() + 7);
    return `/api/appointments?view=calendar&from=${from.toISOString()}&to=${to.toISOString()}`;
  }, [calYear, calMonth]);

  const { data: calData, error: calErr, loading: calLoading, refetch: refetchCal } =
    useFetch<CalResp>(view === "calendar" ? calQuery : null);

  // Group appointments by day for calendar
  const byDay = useMemo(() => {
    const map = new Map<string, Appt[]>();
    if (calData?.items) {
      for (const a of calData.items) {
        const d = new Date(a.startAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const arr = map.get(key) || [];
        arr.push(a);
        map.set(key, arr);
      }
      for (const arr of map.values()) arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [calData]);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(a: Appt) { setEditing(a); setFormOpen(true); }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await apiDelete(`/api/appointments/${confirmDelete.id}`);
    if (res.ok) {
      toast.success("نوبت حذف شد.");
      setConfirmDelete(null);
      refetchList(); refetchCal();
    } else {
      toast.error(res.error || "حذف ناموفق بود.");
    }
  }

  async function quickStatus(a: Appt, newStatus: string) {
    const res = await apiPut(`/api/appointments/${a.id}`, { status: newStatus });
    if (res.ok) {
      toast.success("وضعیت نوبت به‌روزرسانی شد.");
      refetchList(); refetchCal();
    } else {
      toast.error(res.error || "خطا در تغییر وضعیت.");
    }
  }

  function prevMonth() {
    if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }
  function goToday() {
    setCalYear(todayJ.jy); setCalMonth(todayJ.jm);
  }

  // Build calendar grid: 6 rows × 7 cols
  const grid = useMemo(() => {
    const first = fromJalali(calYear, calMonth, 1);
    const daysInMonth = jalaaliMonthLength(calYear, calMonth);
    const startWeekday = persianWeekday(first); // 0..6 (Sat..Fri)
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(fromJalali(calYear, calMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="نوبت‌ها"
        subtitle="مدیریت نوبت‌ها و تقویم کلینیک"
        icon={<CalendarDays className="size-5" />}
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus className="size-4 ml-1" />
              نوبت جدید
            </Button>
          )
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarDays className="size-4 ml-1" />
            تقویم
          </TabsTrigger>
          <TabsTrigger value="list">
            <Filter className="size-4 ml-1" />
            لیست
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-3 sm:p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
                <div className="font-semibold text-sm sm:text-base">
                  {PERSIAN_MONTHS[calMonth - 1]} {toPersianDigits(calYear)}
                </div>
                <Button variant="ghost" size="sm" onClick={goToday}>
                  امروز
                </Button>
              </div>

              {calLoading ? (
                <LoadingState rows={6} />
              ) : calErr ? (
                <ErrorState message={calErr} onRetry={refetchCal} />
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Weekday headers */}
                  {PERSIAN_WEEKDAYS_SHORT.map((w, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-1.5">
                      {w}
                    </div>
                  ))}
                  {/* Day cells */}
                  {grid.map((date, idx) => {
                    if (!date) return <div key={idx} className="min-h-20 sm:min-h-28 rounded-lg bg-muted/30" />;
                    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    const items = byDay.get(key) || [];
                    const j = toJalali(date);
                    const isToday = j.jy === todayJ.jy && j.jm === todayJ.jm && j.jd === todayJ.jd;
                    return (
                      <div
                        key={idx}
                        className={`min-h-20 sm:min-h-28 rounded-lg border border-border/60 p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-muted/40 transition ${isToday ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}
                        onClick={() => setDayModal({ date, items })}
                      >
                        <div className={`text-xs font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                          {toPersianDigits(j.jd)}
                        </div>
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {items.slice(0, 3).map((a) => (
                            <div
                              key={a.id}
                              className="text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canUpdate) openEdit(a);
                                else setDayModal({ date, items });
                              }}
                              title={`${formatTime(a.startAt)} — ${a.patient.firstName} ${a.patient.lastName}`}
                            >
                              {formatTime(a.startAt).slice(0, 5)} {a.patient.firstName}
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1.5">
                              +{toPersianDigits(items.length - 3)} مورد دیگر
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="جستجو بر اساس نام مراجع…"
                  className="flex-1"
                />
                <Select value={status} onValueChange={(v) => { setStatus(v); setPageNum(1); }}>
                  <SelectTrigger className="sm:w-44 bg-background">
                    <Filter className="size-4 ml-1 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    {APPT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setPageNum(1); }}>
                  <SelectTrigger className="sm:w-44 bg-background">
                    <SelectValue placeholder="همه پزشکان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه پزشکان</SelectItem>
                    {staffData?.items.filter((s) => s.type === "doctor").map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {listLoading ? (
                <LoadingState rows={6} />
              ) : listErr ? (
                <ErrorState message={listErr} onRetry={refetchList} />
              ) : !listData || listData.items.length === 0 ? (
                <EmptyState
                  title="نوبتی یافت نشد"
                  icon={<CalendarDays className="size-7" />}
                  action={canCreate && <Button onClick={openCreate}><Plus className="size-4 ml-1" />نوبت جدید</Button>}
                />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-right font-medium p-3">تاریخ و ساعت</th>
                          <th className="text-right font-medium p-3">مراجع</th>
                          <th className="text-right font-medium p-3">پزشک</th>
                          <th className="text-right font-medium p-3">خدمت</th>
                          <th className="text-right font-medium p-3">مبلغ</th>
                          <th className="text-right font-medium p-3">وضعیت</th>
                          <th className="text-left font-medium p-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {listData.items.map((a) => (
                          <tr key={a.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => canUpdate && openEdit(a)}>
                            <td className="p-3">
                              <div className="font-medium">{formatDate(a.startAt)}</div>
                              <div className="text-xs text-muted-foreground" dir="ltr">{formatTime(a.startAt)} - {a.endAt ? formatTime(a.endAt) : "—"}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="size-7">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {a.patient.firstName.charAt(0)}{a.patient.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{a.patient.firstName} {a.patient.lastName}</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{a.doctor?.fullName || "—"}</td>
                            <td className="p-3 text-muted-foreground">{a.service?.name || "—"}</td>
                            <td className="p-3 tabular">{a.price ? formatCurrency(a.price) : "—"}</td>
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="inline-flex">
                                    <StatusBadge status={a.status} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {APPT_STATUSES.map((s) => (
                                    <DropdownMenuItem key={s.value} onClick={() => quickStatus(a, s.value)}>
                                      {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canUpdate && (
                                    <DropdownMenuItem onClick={() => openEdit(a)}>
                                      <Edit className="size-4 ml-2" /> ویرایش
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setPage("patient-detail", { id: a.patient.id })}>
                                    <UserIcon className="size-4 ml-2" /> پرونده مراجع
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmDelete(a)}>
                                      <Trash2 className="size-4 ml-2" /> حذف
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-border/60">
                    {listData.items.map((a) => (
                      <div key={a.id} className="p-3" onClick={() => canUpdate && openEdit(a)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {a.patient.firstName.charAt(0)}{a.patient.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-sm">{a.patient.firstName} {a.patient.lastName}</div>
                              <div className="text-xs text-muted-foreground">{a.service?.name || "—"}</div>
                            </div>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {formatDate(a.startAt)} {formatTime(a.startAt)}
                          </span>
                          {a.price ? <span className="font-medium text-foreground">{formatCurrency(a.price)}</span> : null}
                        </div>
                        {a.doctor && <div className="text-xs text-muted-foreground mt-1">پزشک: {a.doctor.fullName}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {listData.totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-border/60 text-sm">
                      <div className="text-muted-foreground text-xs">
                        {toPersianDigits((page - 1) * listData.pageSize + 1)} تا {toPersianDigits(Math.min(page * listData.pageSize, listData.total))} از {toPersianDigits(listData.total)}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPageNum((p) => p - 1)}>قبلی</Button>
                        <Button variant="outline" size="sm" disabled={page >= listData.totalPages} onClick={() => setPageNum((p) => p + 1)}>بعدی</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Day detail modal */}
      <Dialog open={!!dayModal} onOpenChange={(v) => !v && setDayModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              {dayModal ? formatDateLong(dayModal.date) : ""}
            </DialogTitle>
            <DialogDescription>
              {dayModal ? `${toPersianDigits(dayModal.items.length)} نوبت` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scroll">
            {!dayModal || dayModal.items.length === 0 ? (
              <EmptyState title="نوبتی در این روز نیست" icon={<CalendarDays className="size-6" />} />
            ) : (
              dayModal.items.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer"
                  onClick={() => {
                    setDayModal(null);
                    if (canUpdate) openEdit(a);
                  }}
                >
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {formatTime(a.startAt).slice(0, 5)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{a.patient.firstName} {a.patient.lastName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.service?.name || "—"}
                      {a.doctor && ` • ${a.doctor.fullName}`}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
            {canCreate && dayModal && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  const startAt = new Date(dayModal.date);
                  startAt.setHours(9, 0, 0, 0);
                  setEditing({
                    id: "", startAt: startAt.toISOString(), endAt: null, status: "booked",
                    price: null, notes: null, durationMin: 30,
                    patient: { id: "", firstName: "", lastName: "", code: "" },
                    doctor: null, service: null,
                  });
                  setDayModal(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4 ml-1" />
                افزودن نوبت به این روز
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        prefillPatientId={(params.patientId as string) || undefined}
        doctors={staffData?.items || []}
        services={servicesData?.items || []}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          refetchList(); refetchCal();
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="حذف نوبت"
        description={`آیا از حذف نوبت «${confirmDelete?.patient.firstName} ${confirmDelete?.patient.lastName}» مطمئن هستید؟`}
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------- AppointmentFormDialog ----------------

function AppointmentFormDialog({
  open, onOpenChange, editing, prefillPatientId, doctors, services, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Appt | null;
  prefillPatientId?: string;
  doctors: StaffOpt[];
  services: ServiceOpt[];
  onSaved: () => void;
}) {
  const [patientQ, setPatientQ] = useState("");
  const [patientResults, setPatientResults] = useState<PatientOpt[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientOpt | null>(null);

  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    serviceId: "",
    startAt: new Date().toISOString(),
    durationMin: 30,
    status: "booked",
    notes: "",
    price: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing && editing.id) {
        setForm({
          patientId: editing.patient.id,
          doctorId: editing.doctor?.id || "",
          serviceId: editing.service?.id || "",
          startAt: editing.startAt,
          durationMin: editing.durationMin || 30,
          status: editing.status,
          notes: editing.notes || "",
          price: editing.price || 0,
        });
        setSelectedPatient({
          id: editing.patient.id,
          firstName: editing.patient.firstName,
          lastName: editing.patient.lastName,
          code: editing.patient.code,
        });
      } else {
        const startAt = new Date();
        startAt.setMinutes(0, 0, 0);
        startAt.setHours(startAt.getHours() + 1);
        setForm({
          patientId: prefillPatientId || "",
          doctorId: "",
          serviceId: "",
          startAt: startAt.toISOString(),
          durationMin: 30,
          status: "booked",
          notes: "",
          price: 0,
        });
        setSelectedPatient(null);
        if (prefillPatientId) {
          // Auto-load the patient
          fetch(`/api/patients?q=&status=all&page=1&pageSize=1000`)
            .then((r) => r.json())
            .then((j) => {
              if (j.ok) {
                const found = (j.data.items as PatientOpt[]).find((p) => p.id === prefillPatientId);
                if (found) setSelectedPatient(found);
              }
            })
            .catch(() => {});
        }
      }
      setErrors({});
      setPatientQ("");
      setPatientResults([]);
    }
  }, [open, editing, prefillPatientId]);

  // Debounced patient search
  useEffect(() => {
    if (!patientQ.trim()) { setPatientResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(patientQ)}&status=all&page=1&pageSize=20`)
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled && j.ok) setPatientResults(j.data.items as PatientOpt[]);
        })
        .catch(() => {})
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [patientQ]);

  // Auto-fill price + duration from selected service
  function onServiceChange(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    setForm((f) => ({
      ...f,
      serviceId,
      durationMin: svc?.durationMin || f.durationMin,
      price: svc?.price || 0,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId) {
      setErrors({ patientId: "انتخاب مراجع الزامی است." });
      return;
    }
    setSaving(true);
    setErrors({});
    const body = {
      patientId: form.patientId,
      doctorId: form.doctorId || undefined,
      serviceId: form.serviceId || undefined,
      startAt: form.startAt,
      durationMin: form.durationMin,
      status: form.status,
      notes: form.notes,
      price: form.price,
    };
    const res = editing && editing.id
      ? await apiPut(`/api/appointments/${editing.id}`, body)
      : await apiPost("/api/appointments", body);
    if (res.ok) {
      toast.success(editing && editing.id ? "نوبت به‌روزرسانی شد." : "نوبت جدید ثبت شد.");
      onSaved();
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      toast.error(res.error || "خطا در ثبت نوبت.");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>{editing && editing.id ? "ویرایش نوبت" : "نوبت جدید"}</DialogTitle>
          <DialogDescription>
            {editing && editing.id ? `ویرایش نوبت ${editing.patient.firstName} ${editing.patient.lastName}` : "اطلاعات نوبت را وارد کنید."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Patient autocomplete */}
          <FormField label="مراجع" required error={errors.patientId}>
            {selectedPatient ? (
              <div className="flex items-center gap-2 p-2 rounded-md border border-input bg-background">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {selectedPatient.firstName.charAt(0)}{selectedPatient.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{toPersianDigits(selectedPatient.code)}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setForm((f) => ({ ...f, patientId: "" })); }}>
                  تغییر
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={patientQ}
                  onChange={(e) => setPatientQ(e.target.value)}
                  placeholder="نام، موبایل یا کد مراجع را وارد کنید…"
                  className="bg-background"
                />
                {searching && <div className="text-xs text-muted-foreground">در حال جستجو…</div>}
                {patientResults.length > 0 && (
                  <div className="border border-border rounded-md max-h-48 overflow-y-auto custom-scroll divide-y divide-border/60">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setForm((f) => ({ ...f, patientId: p.id }));
                          setPatientResults([]);
                          setPatientQ("");
                        }}
                        className="w-full flex items-center gap-2 p-2 hover:bg-muted/40 text-right"
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{p.firstName} {p.lastName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{toPersianDigits(p.code)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="پزشک">
              <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue placeholder="انتخاب…" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="خدمت">
              <Select value={form.serviceId} onValueChange={onServiceChange}>
                <SelectTrigger className="bg-background w-full"><SelectValue placeholder="انتخاب…" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="تاریخ و زمان شروع" required error={errors.startAt}>
            <PersianDateTimePicker value={form.startAt} onChange={(v) => setForm({ ...form, startAt: v })} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="مدت (دقیقه)">
              <Input
                type="number"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                min={5}
                step={5}
              />
            </FormField>
            <FormField label="مبلغ (تومان)">
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                min={0}
              />
            </FormField>
          </div>

          <FormField label="وضعیت">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="یادداشت">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "در حال ثبت…" : editing && editing.id ? "ذخیره تغییرات" : "ثبت نوبت"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
