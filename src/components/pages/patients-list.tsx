"use client";

import { useState, useEffect } from "react";
import {
  PageHeader, Card, CardContent, SearchInput, EmptyState, LoadingState,
  ErrorState, ConfirmDialog, StatusBadge, FormField, useFetch, apiPost,
} from "@/components/common";
import { useNav, useAuthStore } from "@/lib/store";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Phone, Filter, MoreVertical, Trash2, Edit, Eye } from "lucide-react";
import { formatNumber, toPersianDigits, formatRelativeTime, formatDate } from "@/lib/persian";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Patient = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  phone: string | null;
  nationalId: string | null;
  gender: string | null;
  status: string;
  source: string | null;
  createdAt: string;
  lastVisitAt: string | null;
  _count?: { appointments: number; payments: number };
};

type ListResp = {
  items: Patient[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function PatientsListPage() {
  const params = useNav((s) => s.params);
  const setPage = useNav((s) => s.setPage);
  const user = useAuthStore((s) => s.user);

  const [q, setQ] = useState((params.q as string) || "");
  const [status, setStatus] = useState("all");
  const [page, setPageNum] = useState(1);
  const [formOpen, setFormOpen] = useState(!!params.new);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);

  // Debounce search
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPageNum(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const query = new URLSearchParams({
    q: debouncedQ,
    status,
    page: String(page),
    pageSize: "20",
  }).toString();
  const { data, error, loading, refetch } = useFetch<ListResp>(`/api/patients?${query}`);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await apiDeleteSafe(`/api/patients/${confirmDelete.id}`);
    if (res.ok) {
      toast.success("مراجع با موفقیت حذف شد.");
      setConfirmDelete(null);
      refetch();
    } else {
      toast.error(res.error || "حذف ناموفق بود.");
    }
  }

  const canCreate = hasPermission(user, "patients.create");
  const canUpdate = hasPermission(user, "patients.update");
  const canDelete = hasPermission(user, "patients.delete");

  return (
    <div className="space-y-4">
      <PageHeader
        title="مراجعین"
        subtitle="مدیریت پرونده مراجعین و بیماران"
        icon={<Users className="size-5" />}
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <UserPlus className="size-4 ml-1" />
              مراجع جدید
            </Button>
          )
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="جستجو بر اساس نام، موبایل، کد ملی یا کد پرونده…"
              className="flex-1"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPageNum(1); }}>
              <SelectTrigger className="sm:w-44 bg-background">
                <Filter className="size-4 ml-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
                <SelectItem value="blacklisted">بلاک شده</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState rows={6} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="مراجعی یافت نشد"
              description="برای شروع، اولین مراجع خود را ثبت کنید."
              icon={<Users className="size-7" />}
              action={canCreate && <Button onClick={openCreate}><UserPlus className="size-4 ml-1" />مراجع جدید</Button>}
            />
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium p-3">کد</th>
                      <th className="text-right font-medium p-3">نام و نام خانوادگی</th>
                      <th className="text-right font-medium p-3">موبایل</th>
                      <th className="text-right font-medium p-3">آخرین مراجعه</th>
                      <th className="text-right font-medium p-3">نوبت‌ها</th>
                      <th className="text-right font-medium p-3">وضعیت</th>
                      <th className="text-left font-medium p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.items.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setPage("patient-detail", { id: p.id })}
                      >
                        <td className="p-3 font-mono text-xs">{toPersianDigits(p.code)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{p.firstName} {p.lastName}</span>
                          </div>
                        </td>
                        <td className="p-3" dir="ltr">{toPersianDigits(p.mobile || "—")}</td>
                        <td className="p-3 text-muted-foreground text-xs">{p.lastVisitAt ? formatRelativeTime(p.lastVisitAt) : "—"}</td>
                        <td className="p-3 tabular">{toPersianDigits(p._count?.appointments || 0)}</td>
                        <td className="p-3"><StatusBadge status={p.status} /></td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setPage("patient-detail", { id: p.id })}>
                                <Eye className="size-4 ml-2" /> مشاهده پروفایل
                              </DropdownMenuItem>
                              {canUpdate && (
                                <DropdownMenuItem onClick={() => openEdit(p)}>
                                  <Edit className="size-4 ml-2" /> ویرایش
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmDelete(p)}>
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

              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-border/60">
                {data.items.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setPage("patient-detail", { id: p.id })}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm truncate">
                            {p.firstName} {p.lastName}
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                          {toPersianDigits(p.mobile || "—")}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="font-mono">{toPersianDigits(p.code)}</span>
                          <span>•</span>
                          <span>{toPersianDigits(p._count?.appointments || 0)} نوبت</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border/60 text-sm">
                  <div className="text-muted-foreground text-xs">
                    {toPersianDigits((page - 1) * data.pageSize + 1)} تا {toPersianDigits(Math.min(page * data.pageSize, data.total))} از {toPersianDigits(data.total)}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPageNum((p) => p - 1)}>
                      قبلی
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPageNum((p) => p + 1)}>
                      بعدی
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          setFormOpen(false);
          refetch();
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="حذف مراجع"
        description={`آیا از حذف «${confirmDelete?.firstName} ${confirmDelete?.lastName}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

async function apiDeleteSafe(url: string) {
  try {
    const r = await fetch(url, { method: "DELETE" });
    const j = await r.json();
    return j;
  } catch {
    return { ok: false, error: "اتصال به سرور برقرار نشد." };
  }
}

// ---------------- PatientFormDialog ----------------

function PatientFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Patient | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", mobile: "", phone: "", nationalId: "",
    gender: "", birthDate: "", email: "", address: "", description: "",
    status: "active", source: "walk_in",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          firstName: editing.firstName,
          lastName: editing.lastName,
          mobile: editing.mobile || "",
          phone: editing.phone || "",
          nationalId: editing.nationalId || "",
          gender: editing.gender || "",
          birthDate: editing.birthDate ? new Date(editing.birthDate as unknown as string).toISOString().slice(0, 10) : "",
          email: "",
          address: editing.address || "",
          description: editing.description || "",
          status: editing.status,
          source: editing.source || "walk_in",
        });
      } else {
        setForm({
          firstName: "", lastName: "", mobile: "", phone: "", nationalId: "",
          gender: "", birthDate: "", email: "", address: "", description: "",
          status: "active", source: "walk_in",
        });
      }
      setErrors({});
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const url = editing ? `/api/patients/${editing.id}` : "/api/patients";
    const method = editing ? "PUT" : "POST";
    try {
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (j.ok) {
        toast.success(editing ? "اطلاعات مراجع به‌روزرسانی شد." : "مراجع جدید با موفقیت ثبت شد.");
        onSaved();
      } else if (j.errors) {
        setErrors(j.errors);
      } else {
        toast.error(j.error || "خطا در ثبت اطلاعات.");
      }
    } catch {
      toast.error("اتصال به سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  // Use Dialog on desktop, Sheet on mobile
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش مراجع" : "مراجع جدید"}</DialogTitle>
          <DialogDescription>
            {editing ? `ویرایش پرونده ${editing.code}` : "اطلاعات هویتی و تماس مراجع را وارد کنید."}
          </DialogDescription>
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
            <FormField label="شماره موبایل" error={errors.mobile} hint="۱۱ رقم، با ۰۹ شروع شود">
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} dir="ltr" className="text-left" placeholder="0912xxxxxxx" />
            </FormField>
            <FormField label="کد ملی" error={errors.nationalId}>
              <Input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} dir="ltr" className="text-left" placeholder="XXXXXXXXXX" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="جنسیت">
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="انتخاب…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">مرد</SelectItem>
                  <SelectItem value="female">زن</SelectItem>
                  <SelectItem value="other">سایر</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="تاریخ تولد">
              <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </FormField>
          </div>
          <FormField label="آدرس">
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </FormField>
          <FormField label="توضیحات">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="منبع آشنایی">
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">مراجعه حضوری</SelectItem>
                  <SelectItem value="referral">معرفی</SelectItem>
                  <SelectItem value="instagram">اینستاگرام</SelectItem>
                  <SelectItem value="call">تماس</SelectItem>
                  <SelectItem value="website">وب‌سایت</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="وضعیت">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                  <SelectItem value="blacklisted">بلاک شده</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ثبت…" : editing ? "ذخیره تغییرات" : "ثبت مراجع"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
