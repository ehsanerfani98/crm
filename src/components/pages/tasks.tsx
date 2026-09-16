"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from "react";
import {
  PageHeader, Card, CardHeader, CardContent, SearchInput, EmptyState, LoadingState,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare, Plus, Filter, MoreVertical, Trash2, Edit,
  CalendarClock, AlertCircle, Check, User as UserIcon,
} from "lucide-react";
import {
  formatNumber, toPersianDigits, formatRelativeTime,
  formatDate, formatTime,
} from "@/lib/persian";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  patientId: string | null;
  assignedToId: string | null;
  createdAt: string;
  patient?: { id: string; firstName: string; lastName: string; code: string } | null;
  assignedTo?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
};

type ListResp = {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type UserOpt = { id: string; name: string; email: string };

const TASK_STATUSES = [
  { value: "pending", label: "در انتظار" },
  { value: "in_progress", label: "در حال انجام" },
  { value: "done", label: "انجام شده" },
  { value: "cancelled", label: "لغو شده" },
];

const TASK_PRIORITIES = [
  { value: "low", label: "پایین" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "بالا" },
  { value: "urgent", label: "فوری" },
];

type GroupBy = "status" | "priority" | "due";

export function TasksPage() {
  const params = useNav((s) => s.params);
  const setPage = useNav((s) => s.setPage);
  const user = useAuthStore((s) => s.user);

  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignedToId, setAssignedToId] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

  // Form
  const [formOpen, setFormOpen] = useState(!!params.new);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const canCreate = hasPermission(user, "tasks.create");
  const canUpdate = hasPermission(user, "tasks.update");
  const canDelete = hasPermission(user, "tasks.delete");

  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data: settingsData } = useFetch<{ users?: UserOpt[] }>(`/api/settings?include=users`);
  const users = settingsData?.users || [];

  const query = useMemo(() => {
    const sp = new URLSearchParams({
      q: debouncedQ, status, priority, assignedToId,
      page: "1", pageSize: "500",
    });
    return `/api/tasks?${sp.toString()}`;
  }, [debouncedQ, status, priority, assignedToId]);

  const { data, error, loading, refetch } = useFetch<ListResp>(query);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(t: Task) { setEditing(t); setFormOpen(true); }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await apiDelete(`/api/tasks/${confirmDelete.id}`);
    if (res.ok) {
      toast.success("وظیفه حذف شد.");
      setConfirmDelete(null);
      refetch();
    } else {
      toast.error(res.error || "حذف ناموفق بود.");
    }
  }

  async function quickStatus(t: Task, newStatus: string) {
    const res = await apiPut(`/api/tasks/${t.id}`, { status: newStatus });
    if (res.ok) {
      toast.success("وضعیت وظیفه تغییر کرد.");
      refetch();
    } else {
      toast.error(res.error || "خطا در تغییر وضعیت.");
    }
  }

  // Group tasks
  const groups = useMemo(() => {
    const map: Record<string, { label: string; items: Task[] }> = {};
    if (!data) return map;
    if (groupBy === "status") {
      for (const s of TASK_STATUSES) map[s.value] = { label: s.label, items: [] };
      for (const t of data.items) {
        (map[t.status] || (map[t.status] = { label: t.status, items: [] })).items.push(t);
      }
    } else if (groupBy === "priority") {
      for (const p of TASK_PRIORITIES) map[p.value] = { label: p.label, items: [] };
      for (const t of data.items) {
        (map[t.priority] || (map[t.priority] = { label: t.priority, items: [] })).items.push(t);
      }
    } else {
      // due: overdue, today, upcoming, no date
      const now = new Date();
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      map["overdue"] = { label: "گذشته", items: [] };
      map["today"] = { label: "امروز", items: [] };
      map["upcoming"] = { label: "آینده", items: [] };
      map["none"] = { label: "بدون موعد", items: [] };
      for (const t of data.items) {
        if (!t.dueDate) { map.none.items.push(t); continue; }
        const d = new Date(t.dueDate);
        if (d < start && t.status !== "done") map.overdue.items.push(t);
        else if (d >= start && d <= end) map.today.items.push(t);
        else if (d > end) map.upcoming.items.push(t);
        else map.overdue.items.push(t);
      }
    }
    return map;
  }, [data, groupBy]);

  const isOverdue = (t: Task) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done";

  return (
    <div className="space-y-4">
      <PageHeader
        title="وظایف"
        subtitle="لیست کارها و یادآوری‌ها"
        icon={<CheckSquare className="size-5" />}
        actions={canCreate && <Button onClick={openCreate}><Plus className="size-4 ml-1" />وظیفه جدید</Button>}
      />

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <SearchInput value={q} onChange={setQ} placeholder="جستجوی وظیفه…" className="flex-1 min-w-[200px]" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-36 bg-background"><Filter className="size-4 ml-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="sm:w-32 bg-background"><SelectValue placeholder="اولویت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه اولویت‌ها</SelectItem>
                {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger className="sm:w-40 bg-background"><SelectValue placeholder="مسئول" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مسئولین</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="sm:w-36 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="status">گروه‌بندی: وضعیت</SelectItem>
                <SelectItem value="priority">گروه‌بندی: اولویت</SelectItem>
                <SelectItem value="due">گروه‌بندی: موعد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="وظیفه‌ای یافت نشد" icon={<CheckSquare className="size-7" />} action={canCreate && <Button onClick={openCreate}><Plus className="size-4 ml-1" />وظیفه جدید</Button>} />
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([key, group]) => group.items.length > 0 && (
            <Card key={key}>
              <CardHeader
                title={group.label}
                subtitle={`${toPersianDigits(group.items.length)} وظیفه`}
                action={
                  groupBy === "due" && key === "overdue" ? (
                    <span className="text-xs text-rose-600 font-medium">گذشته از موعد</span>
                  ) : null
                }
              />
              <CardContent className="p-2">
                <div className="divide-y divide-border/60">
                  {group.items.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 p-3 hover:bg-muted/30">
                      <button
                        disabled={!canUpdate}
                        onClick={() => quickStatus(t, t.status === "done" ? "pending" : "done")}
                        className={`mt-0.5 size-5 rounded-md border flex items-center justify-center transition ${t.status === "done" ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-primary"}`}
                        title="علامت‌گذاری انجام شده"
                      >
                        {t.status === "done" && <Check className="size-3.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm flex-1">
                            {t.title}
                            {isOverdue(t) && <span className="text-rose-600 mr-1">●</span>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7"><MoreVertical className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate && <DropdownMenuItem onClick={() => openEdit(t)}><Edit className="size-4 ml-2" /> ویرایش</DropdownMenuItem>}
                              {canUpdate && (
                                <>
                                  <DropdownMenuItem onClick={() => quickStatus(t, "in_progress")}>شروع انجام</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => quickStatus(t, "done")}>انجام شد</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => quickStatus(t, "cancelled")}>لغو</DropdownMenuItem>
                                </>
                              )}
                              {t.patientId && <DropdownMenuItem onClick={() => setPage("patient-detail", { id: t.patientId! })}><UserIcon className="size-4 ml-2" /> پرونده مراجع</DropdownMenuItem>}
                              {canDelete && <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmDelete(t)}><Trash2 className="size-4 ml-2" /> حذف</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                          <StatusBadge status={t.priority} />
                          <StatusBadge status={t.status} />
                          {t.dueDate && (
                            <span className={`inline-flex items-center gap-1 ${isOverdue(t) ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>
                              <CalendarClock className="size-3" />
                              {formatDate(t.dueDate)} {formatTime(t.dueDate)}
                            </span>
                          )}
                          {t.assignedTo && (
                            <span className="text-muted-foreground">مسئول: {t.assignedTo.name}</span>
                          )}
                          {t.patient && (
                            <button onClick={() => setPage("patient-detail", { id: t.patient!.id })} className="text-primary hover:underline">
                              {t.patient.firstName} {t.patient.lastName}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        users={users}
        onSaved={() => { setFormOpen(false); refetch(); }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="حذف وظیفه"
        description={`آیا از حذف «${confirmDelete?.title}» مطمئن هستید؟`}
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------- TaskFormDialog ----------------

function TaskFormDialog({
  open, onOpenChange, editing, users, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Task | null;
  users: UserOpt[];
  onSaved: () => void;
}) {
  const [patientQ, setPatientQ] = useState("");
  const [patientResults, setPatientResults] = useState<Array<{ id: string; firstName: string; lastName: string; code: string }>>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; firstName: string; lastName: string; code: string } | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", status: "pending", priority: "medium",
    dueDate: "", assignedToId: "", patientId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          title: editing.title,
          description: editing.description || "",
          status: editing.status,
          priority: editing.priority,
          dueDate: editing.dueDate || "",
          assignedToId: editing.assignedToId || "",
          patientId: editing.patientId || "",
        });
        setSelectedPatient(editing.patient || null);
      } else {
        setForm({
          title: "", description: "", status: "pending", priority: "medium",
          dueDate: "", assignedToId: "", patientId: "",
        });
        setSelectedPatient(null);
      }
      setErrors({}); setPatientQ(""); setPatientResults([]);
    }
  }, [open, editing]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErrors({});
    const body = {
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      assignedToId: form.assignedToId || undefined,
      patientId: form.patientId || undefined,
    };
    const res = editing
      ? await apiPut(`/api/tasks/${editing.id}`, body)
      : await apiPost("/api/tasks", body);
    if (res.ok) {
      toast.success(editing ? "وظیفه به‌روزرسانی شد." : "وظیفه جدید ثبت شد.");
      onSaved();
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      toast.error(res.error || "خطا در ثبت وظیفه.");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش وظیفه" : "وظیفه جدید"}</DialogTitle>
          <DialogDescription>اطلاعات وظیفه را وارد کنید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="عنوان" required error={errors.title}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <FormField label="توضیحات">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="اولویت">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="وضعیت">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="موعد انجام">
            <PersianDateTimePicker value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
          </FormField>
          <FormField label="مسئول">
            <Select value={form.assignedToId} onValueChange={(v) => setForm({ ...form, assignedToId: v })}>
              <SelectTrigger className="bg-background w-full"><SelectValue placeholder="بدون مسئول" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">بدون مسئول</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="مرتبط با مراجع">
            {selectedPatient ? (
              <div className="flex items-center gap-2 p-2 rounded-md border border-input bg-background">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {selectedPatient.firstName.charAt(0)}{selectedPatient.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setForm((f) => ({ ...f, patientId: "" })); }}>حذف</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="جستجوی مراجع…" className="bg-background" />
                {patientResults.length > 0 && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto custom-scroll divide-y divide-border/60">
                    {patientResults.map((p) => (
                      <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setForm((f) => ({ ...f, patientId: p.id })); setPatientQ(""); setPatientResults([]); }} className="w-full flex items-center gap-2 p-2 hover:bg-muted/40 text-right">
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
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ثبت…" : editing ? "ذخیره تغییرات" : "ثبت وظیفه"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
