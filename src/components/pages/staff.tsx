"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import {
  PageHeader, Card, CardContent, SearchInput, EmptyState, LoadingState,
  ErrorState, ConfirmDialog, StatusBadge, FormField, useFetch,
  apiPost, apiPut, apiDelete,
} from "@/components/common";
import { useAuthStore } from "@/lib/store";
import { hasPermission, ROLE_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserCog, Plus, Filter, MoreVertical, Trash2, Edit, Phone, Mail, Clock,
  Stethoscope, Calendar as CalendarIcon,
} from "lucide-react";
import { toPersianDigits } from "@/lib/persian";
import { toast } from "sonner";

// Radix Select forbids an empty-string item value (it is reserved to clear the
// selection and show the placeholder), so we use a non-empty sentinel and map
// it back to "" at the Select boundary.
const NONE_VALUE = "__none__";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  type: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  workDays: string | null;
  workStart: string | null;
  workEnd: string | null;
  color: string | null;
  user?: { id: string; name: string; email: string; status: string } | null;
  services?: Array<{ service: { id: string; name: string; price: number; durationMin: number; category: string | null } }> | null;
  _count?: { appointments: number };
};

type UserOpt = { id: string; name: string; email: string };

const STAFF_TYPES = [
  { value: "doctor", label: "پزشک" },
  { value: "secretary", label: "منشی" },
  { value: "operator", label: "اپراتور" },
  { value: "manager", label: "مدیر" },
  { value: "other", label: "سایر" },
];

const TYPE_LABEL: Record<string, string> = {
  doctor: "پزشک", secretary: "منشی", operator: "اپراتور", manager: "مدیر", other: "سایر",
};

const TYPE_COLOR: Record<string, string> = {
  doctor: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  secretary: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  operator: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  manager: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

const WORK_DAYS = [
  { key: "sat", label: "شنبه" },
  { key: "sun", label: "یک‌شنبه" },
  { key: "mon", label: "دوشنبه" },
  { key: "tue", label: "سه‌شنبه" },
  { key: "wed", label: "چهارشنبه" },
  { key: "thu", label: "پنج‌شنبه" },
  { key: "fri", label: "جمعه" },
];

const PRESET_COLORS = ["#0d9488", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#6366f1"];

export function StaffPage() {
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [detail, setDetail] = useState<Staff | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Staff | null>(null);

  const canManage = hasPermission(user, "staff.manage");

  const query = `/api/staff?type=${type}&status=${status}&q=${encodeURIComponent(q)}`;
  const { data, error, loading, refetch } = useFetch<{ items: Staff[] }>(query);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(s: Staff) { setEditing(s); setFormOpen(true); }
  async function openDetail(s: Staff) {
    const r = await fetch(`/api/staff/${s.id}`);
    const j = await r.json();
    if (j.ok) setDetail(j.data.staff);
    else setDetail(s);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await apiDelete(`/api/staff/${confirmDelete.id}`);
    if (res.ok) {
      toast.success("عضو کادر حذف شد.");
      setConfirmDelete(null);
      refetch();
    } else {
      toast.error(res.error || "حذف ناموفق بود.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="کارکنان"
        subtitle="مدیریت پزشکان و کادر درمان"
        icon={<UserCog className="size-5" />}
        actions={canManage && <Button onClick={openCreate}><Plus className="size-4 ml-1" />عضو جدید</Button>}
      />

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="جستجو بر اساس نام، تخصص یا تلفن…" className="flex-1" />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="sm:w-36 bg-background"><Filter className="size-4 ml-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                {STAFF_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-32 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="عضو کادری یافت نشد" icon={<UserCog className="size-7" />} action={canManage && <Button onClick={openCreate}><Plus className="size-4 ml-1" />عضو جدید</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.items.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition cursor-pointer" >
              <CardContent className="p-4" onClick={() => openDetail(s)}>
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="size-12">
                    <AvatarFallback className="text-base font-semibold" style={{ background: s.color || "#0d9488", color: "#fff" }}>
                      {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{s.fullName}</h3>
                    {s.specialty && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.specialty}</p>}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[s.type] || TYPE_COLOR.other}`}>
                        {TYPE_LABEL[s.type] || s.type}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                  {canManage && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8"><MoreVertical className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}><Edit className="size-4 ml-2" /> ویرایش</DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmDelete(s)}><Trash2 className="size-4 ml-2" /> حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {s.phone && <div className="flex items-center gap-1.5" dir="ltr"><Phone className="size-3.5" />{toPersianDigits(s.phone)}</div>}
                  {s.email && <div className="flex items-center gap-1.5 truncate" dir="ltr"><Mail className="size-3.5" />{s.email}</div>}
                  {(s.workStart || s.workEnd) && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {s.workStart && toPersianDigits(s.workStart)} - {s.workEnd && toPersianDigits(s.workEnd)}
                    </div>
                  )}
                  {s.workDays && (
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5" />
                      {s.workDays.split(",").map((d) => WORK_DAYS.find((w) => w.key === d)?.label || d).join("، ")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto custom-scroll">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detail && (
                <>
                  <Avatar className="size-10">
                    <AvatarFallback className="text-sm font-semibold" style={{ background: detail.color || "#0d9488", color: "#fff" }}>
                      {detail.firstName.charAt(0)}{detail.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div>{detail.fullName}</div>
                    <div className="text-xs text-muted-foreground font-normal">{detail.specialty || TYPE_LABEL[detail.type]}</div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[detail.type] || TYPE_COLOR.other}`}>
                  {TYPE_LABEL[detail.type] || detail.type}
                </span>
                <StatusBadge status={detail.status} />
                {detail.user && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">حساب کاربری متصل</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {detail.phone && <div><span className="text-muted-foreground">تلفن:</span> <span dir="ltr">{toPersianDigits(detail.phone)}</span></div>}
                {detail.email && <div className="truncate"><span className="text-muted-foreground">ایمیل:</span> <span dir="ltr">{detail.email}</span></div>}
                {(detail.workStart || detail.workEnd) && (
                  <div><span className="text-muted-foreground">ساعات کاری:</span> {detail.workStart && toPersianDigits(detail.workStart)} - {detail.workEnd && toPersianDigits(detail.workEnd)}</div>
                )}
                {detail.workDays && (
                  <div className="col-span-2"><span className="text-muted-foreground">روزهای کاری:</span> {detail.workDays.split(",").map((d) => WORK_DAYS.find((w) => w.key === d)?.label || d).join("، ")}</div>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Stethoscope className="size-3.5" />
                  خدمات ({toPersianDigits(detail.services?.length || 0)})
                </div>
                {!detail.services || detail.services.length === 0 ? (
                  <div className="text-xs text-muted-foreground">خدماتی ثبت نشده است.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.services.map((ss) => (
                      <span key={ss.service.id} className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs">
                        {ss.service.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {detail._count && (
                <div className="text-xs text-muted-foreground">
                  مجموع نوبت‌ها: {toPersianDigits(detail._count.appointments || 0)}
                </div>
              )}
              {canManage && (
                <Button variant="outline" className="w-full" onClick={() => { setEditing(detail); setDetail(null); setFormOpen(true); }}>
                  <Edit className="size-4 ml-1" /> ویرایش
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => { setFormOpen(false); refetch(); }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="حذف عضو کادر"
        description={`آیا از حذف «${confirmDelete?.fullName}» مطمئن هستید؟`}
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------- StaffFormDialog ----------------

function StaffFormDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Staff | null;
  onSaved: () => void;
}) {
  const { data: settingsData } = useFetch<{ users?: UserOpt[] }>(`/api/settings?include=users`);
  const users = settingsData?.users || [];

  const [form, setForm] = useState({
    firstName: "", lastName: "", type: "doctor", specialty: "",
    phone: "", email: "", status: "active",
    workDays: [] as string[], workStart: "", workEnd: "",
    color: PRESET_COLORS[0], userId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          firstName: editing.firstName,
          lastName: editing.lastName,
          type: editing.type,
          specialty: editing.specialty || "",
          phone: editing.phone || "",
          email: editing.email || "",
          status: editing.status,
          workDays: editing.workDays ? editing.workDays.split(",") : [],
          workStart: editing.workStart || "",
          workEnd: editing.workEnd || "",
          color: editing.color || PRESET_COLORS[0],
          userId: editing.user?.id || "",
        });
      } else {
        setForm({
          firstName: "", lastName: "", type: "doctor", specialty: "",
          phone: "", email: "", status: "active",
          workDays: [], workStart: "", workEnd: "",
          color: PRESET_COLORS[0], userId: "",
        });
      }
      setErrors({});
    }
  }, [open, editing]);

  function toggleDay(key: string) {
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(key) ? f.workDays.filter((d) => d !== key) : [...f.workDays, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErrors({});
    const body = {
      firstName: form.firstName,
      lastName: form.lastName,
      fullName: `${form.firstName} ${form.lastName}`,
      type: form.type,
      specialty: form.specialty || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      status: form.status,
      workDays: form.workDays.join(",") || undefined,
      workStart: form.workStart || undefined,
      workEnd: form.workEnd || undefined,
      color: form.color,
      userId: form.userId || undefined,
    };
    const res = editing
      ? await apiPut(`/api/staff/${editing.id}`, body)
      : await apiPost("/api/staff", body);
    if (res.ok) {
      toast.success(editing ? "اطلاعات عضو کادر به‌روزرسانی شد." : "عضو کادر جدید ثبت شد.");
      onSaved();
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      toast.error(res.error || "خطا در ثبت اطلاعات.");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش عضو کادر" : "عضو کادر جدید"}</DialogTitle>
          <DialogDescription>اطلاعات عضو کادر را وارد کنید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="نام" required error={errors.firstName}>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </FormField>
            <FormField label="نام خانوادگی" required error={errors.lastName}>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="نوع">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="تخصص">
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="مثلاً: متخصص پوست" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="تلفن" error={errors.phone} hint="۱۱ رقم با ۰">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="text-left" placeholder="0912xxxxxxx" />
            </FormField>
            <FormField label="ایمیل" error={errors.email}>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="text-left" placeholder="name@example.com" />
            </FormField>
          </div>

          <FormField label="روزهای کاری">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {WORK_DAYS.map((d) => (
                <label key={d.key} className="flex flex-col items-center gap-1 p-1 rounded hover:bg-muted/40 cursor-pointer text-xs">
                  <Checkbox checked={form.workDays.includes(d.key)} onCheckedChange={() => toggleDay(d.key)} />
                  <span>{d.label}</span>
                </label>
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="شروع کار">
              <Input type="time" value={form.workStart} onChange={(e) => setForm({ ...form, workStart: e.target.value })} dir="ltr" className="text-left bg-background" />
            </FormField>
            <FormField label="پایان کار">
              <Input type="time" value={form.workEnd} onChange={(e) => setForm({ ...form, workEnd: e.target.value })} dir="ltr" className="text-left bg-background" />
            </FormField>
          </div>

          <FormField label="رنگ تقویم">
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`size-7 rounded-full transition ${form.color === c ? "ring-2 ring-offset-2 ring-foreground" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="حساب کاربری (اختیاری)" hint="اتصال به کاربر سیستم">
              <Select value={form.userId || NONE_VALUE} onValueChange={(v) => setForm({ ...form, userId: v === NONE_VALUE ? "" : v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue placeholder="بدون اتصال" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>بدون اتصال</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="وضعیت">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ثبت…" : editing ? "ذخیره تغییرات" : "ثبت عضو"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
