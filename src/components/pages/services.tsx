"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import {
  PageHeader, Card, CardContent, SearchInput, EmptyState, LoadingState,
  ErrorState, ConfirmDialog, StatusBadge, FormField, useFetch,
  apiPost, apiPut, apiDelete,
} from "@/components/common";
import { useAuthStore } from "@/lib/store";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope, Plus, Filter, MoreVertical, Trash2, Edit, Clock, Wallet, UserCircle,
} from "lucide-react";
import {
  formatCurrency, toPersianDigits,
} from "@/lib/persian";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
  category: string | null;
  status: string;
  staff?: Array<{ staffId: string; staff: { id: string; fullName: string; color?: string | null } }> | null;
  _count?: { appointments: number };
};

type StaffOpt = { id: string; fullName: string; type: string; color?: string | null };

const CATEGORIES = [
  { value: "visit", label: "ویزیت" },
  { value: "consult", label: "مشاوره" },
  { value: "laser", label: "لیزر" },
  { value: "injection", label: "تزریق" },
  { value: "beauty", label: "زیبایی" },
  { value: "lab", label: "آزمایشگاه" },
  { value: "other", label: "سایر" },
];

const CATEGORY_LABEL: Record<string, string> = {
  visit: "ویزیت", consult: "مشاوره", laser: "لیزر",
  injection: "تزریق", beauty: "زیبایی", lab: "آزمایشگاه", other: "سایر",
};

const CATEGORY_COLOR: Record<string, string> = {
  visit: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  consult: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  laser: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  injection: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  beauty: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  lab: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export function ServicesPage() {
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  const canManage = hasPermission(user, "services.manage");

  const query = `/api/services?status=${status}&category=${category}`;
  const { data, error, loading, refetch } = useFetch<{ items: Service[] }>(query);

  const { data: staffData } = useFetch<{ items: StaffOpt[] }>(`/api/staff`);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(s: Service) { setEditing(s); setFormOpen(true); }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await apiDelete(`/api/services/${confirmDelete.id}`);
    if (res.ok) {
      toast.success("خدمت حذف شد.");
      setConfirmDelete(null);
      refetch();
    } else {
      toast.error(res.error || "حذف ناموفق بود.");
    }
  }

  const filtered = (data?.items || []).filter((s) => {
    if (q && !s.name.toLowerCase().includes(q.toLowerCase()) && !(s.description || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="خدمات"
        subtitle="مدیریت خدمات و قیمت‌گذاری"
        icon={<Stethoscope className="size-5" />}
        actions={canManage && <Button onClick={openCreate}><Plus className="size-4 ml-1" />خدمت جدید</Button>}
      />

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="جستجوی خدمت…" className="flex-1" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-40 bg-background"><Filter className="size-4 ml-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دسته‌ها</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
      ) : filtered.length === 0 ? (
        <EmptyState title="خدمتی یافت نشد" icon={<Stethoscope className="size-7" />} action={canManage && <Button onClick={openCreate}><Plus className="size-4 ml-1" />خدمت جدید</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                    {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                  </div>
                  {canManage && (
                    <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground shrink-0">
                      <Edit className="size-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {s.category && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLOR[s.category] || CATEGORY_COLOR.other}`}>
                      {CATEGORY_LABEL[s.category] || s.category}
                    </span>
                  )}
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <Wallet className="size-4" />
                    {formatCurrency(s.price)}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Clock className="size-3.5" />
                    {toPersianDigits(s.durationMin)} دقیقه
                  </div>
                </div>
                {/* Doctors */}
                <div className="pt-3 border-t border-border/40">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <UserCircle className="size-3.5" />
                    پزشکان مجاز ({toPersianDigits(s.staff?.length || 0)})
                  </div>
                  {s.staff && s.staff.length > 0 ? (
                    <div className="flex -space-x-2 -space-x-reverse">
                      {s.staff.slice(0, 5).map((ss) => (
                        <Avatar key={ss.staffId} className="size-7 border-2 border-background">
                          <AvatarFallback className="text-[10px] font-semibold" style={{ background: ss.staff.color || "#0d9488", color: "#fff" }}>
                            {ss.staff.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {s.staff.length > 5 && (
                        <div className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium">
                          +{toPersianDigits(s.staff.length - 5)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
                {canManage && (
                  <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{toPersianDigits(s._count?.appointments || 0)} نوبت</span>
                    <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-500/10" onClick={() => setConfirmDelete(s)}>
                      <Trash2 className="size-4 ml-1" /> حذف
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        staff={staffData?.items || []}
        onSaved={() => { setFormOpen(false); refetch(); }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="حذف خدمت"
        description={`آیا از حذف «${confirmDelete?.name}» مطمئن هستید؟`}
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------- ServiceFormDialog ----------------

function ServiceFormDialog({
  open, onOpenChange, editing, staff, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Service | null;
  staff: StaffOpt[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "", description: "", price: 0, durationMin: 30,
    category: "", status: "active", staffIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          description: editing.description || "",
          price: editing.price,
          durationMin: editing.durationMin,
          category: editing.category || "",
          status: editing.status,
          staffIds: (editing.staff || []).map((s) => s.staffId),
        });
      } else {
        setForm({ name: "", description: "", price: 0, durationMin: 30, category: "", status: "active", staffIds: [] });
      }
      setErrors({});
    }
  }, [open, editing]);

  function toggleStaff(id: string) {
    setForm((f) => ({
      ...f,
      staffIds: f.staffIds.includes(id) ? f.staffIds.filter((s) => s !== id) : [...f.staffIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErrors({});
    const body = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      durationMin: Number(form.durationMin),
      category: form.category || undefined,
      status: form.status,
      staffIds: form.staffIds,
    };
    const res = editing
      ? await apiPut(`/api/services/${editing.id}`, body)
      : await apiPost("/api/services", body);
    if (res.ok) {
      toast.success(editing ? "خدمت به‌روزرسانی شد." : "خدمت جدید ثبت شد.");
      onSaved();
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      toast.error(res.error || "خطا در ثبت خدمت.");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش خدمت" : "خدمت جدید"}</DialogTitle>
          <DialogDescription>اطلاعات خدمت را وارد کنید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="نام خدمت" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="توضیحات">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="قیمت (تومان)" required error={errors.price}>
              <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} min={0} />
            </FormField>
            <FormField label="مدت (دقیقه)" hint="مدت زمان هر جلسه">
              <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} min={1} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="دسته‌بندی">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue placeholder="انتخاب…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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

          <FormField label="پزشکان مجاز">
            <div className="border border-border rounded-md p-2 max-h-44 overflow-y-auto custom-scroll space-y-1">
              {staff.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">هیچ عضو کادری ثبت نشده است.</div>
              ) : (
                staff.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                    <Checkbox checked={form.staffIds.includes(s.id)} onCheckedChange={() => toggleStaff(s.id)} />
                    <span className="text-sm flex-1">{s.fullName}</span>
                    <span className="text-xs text-muted-foreground">{s.type === "doctor" ? "پزشک" : s.type}</span>
                  </label>
                ))
              )}
            </div>
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ثبت…" : editing ? "ذخیره تغییرات" : "ثبت خدمت"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
