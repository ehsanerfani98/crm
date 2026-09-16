"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, DragEndEvent, DragStartEvent,
} from "@dnd-kit/core";
import {
  PageHeader, Card, CardContent, SearchInput, EmptyState, LoadingState,
  ErrorState, ConfirmDialog, StatusBadge, FormField, useFetch,
  apiPost, apiPut, apiDelete,
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus, Filter, MoreVertical, Trash2, Edit, ArrowRightLeft,
  Phone, Sparkles, LayoutGrid, List as ListIcon,
} from "lucide-react";
import {
  formatNumber, toPersianDigits, formatRelativeTime,
} from "@/lib/persian";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/permissions";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  source: string | null;
  interest: string | null;
  status: string;
  notes: string | null;
  assignedToId: string | null;
  patientId?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; name: string } | null;
  patient?: { id: string; code: string; firstName: string; lastName: string } | null;
};

type ListResp = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type UserOpt = { id: string; name: string; email: string };

const LEAD_STATUSES = [
  { value: "new", label: "جدید" },
  { value: "contacted", label: "تماس گرفته شد" },
  { value: "interested", label: "علاقه‌مند" },
  { value: "booked", label: "نوبت رزرو شد" },
  { value: "visited", label: "مراجعه کرد" },
  { value: "customer", label: "مشتری" },
  { value: "lost", label: "از دست رفت" },
];

const LEAD_SOURCES = [
  { value: "walk_in", label: "مراجعه حضوری" },
  { value: "referral", label: "معرفی" },
  { value: "instagram", label: "اینستاگرام" },
  { value: "call", label: "تماس" },
  { value: "website", label: "وب‌سایت" },
  { value: "other", label: "سایر" },
];

export function LeadsPage() {
  const params = useNav((s) => s.params);
  const setPage = useNav((s) => s.setPage);
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  // List filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [assignedToId, setAssignedToId] = useState("all");
  const [page, setPageNum] = useState(1);

  // Form state
  const [formOpen, setFormOpen] = useState(!!params.new);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);
  const [activeDrag, setActiveDrag] = useState<Lead | null>(null);

  const canCreate = hasPermission(user, "leads.create");
  const canUpdate = hasPermission(user, "leads.update");
  const canDelete = hasPermission(user, "leads.delete");

  // Debounced search
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPageNum(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch users for assignment + filter
  const { data: settingsData } = useFetch<{ users?: UserOpt[] }>(`/api/settings?include=users`);
  const users = settingsData?.users || [];

  // Fetch all leads for kanban (no pagination)
  const kanbanQuery = useMemo(() => {
    const sp = new URLSearchParams({ q: debouncedQ, status: "all", page: "1", pageSize: "500" });
    return `/api/leads?${sp.toString()}`;
  }, [debouncedQ]);

  const { data: kanbanData, error: kanbanErr, loading: kanbanLoading, refetch: refetchKanban } =
    useFetch<ListResp>(view === "kanban" ? kanbanQuery : null);

  // List query
  const listQuery = useMemo(() => {
    const sp = new URLSearchParams({
      q: debouncedQ, status, source, assignedToId,
      page: String(page), pageSize: "20",
    });
    return `/api/leads?${sp.toString()}`;
  }, [debouncedQ, status, source, assignedToId, page]);

  const { data: listData, error: listErr, loading: listLoading, refetch: refetchList } =
    useFetch<ListResp>(view === "list" ? listQuery : null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(l: Lead) { setEditing(l); setFormOpen(true); }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await apiDelete(`/api/leads/${confirmDelete.id}`);
    if (res.ok) {
      toast.success("لید حذف شد.");
      setConfirmDelete(null);
      refetchKanban(); refetchList();
    } else {
      toast.error(res.error || "حذف ناموفق بود.");
    }
  }

  async function convertToPatient(l: Lead) {
    const res = await apiPut<{ patient?: { id: string }; linked?: boolean }>(`/api/leads/${l.id}`, { convertToPatient: true });
    if (res.ok) {
      toast.success("لید با موفقیت به مراجع تبدیل شد.");
      refetchKanban(); refetchList();
      if (res.data?.patient?.id) {
        if (confirm("پرونده مراجع ایجاد شد. مشاهده پرونده؟")) {
          setPage("patient-detail", { id: res.data.patient.id });
        }
      }
    } else {
      toast.error(res.error || "خطا در تبدیل لید.");
    }
  }

  function onDragStart(e: DragStartEvent) {
    const lead = (kanbanData?.items || []).find((l) => l.id === e.active.id);
    setActiveDrag(lead || null);
  }
  async function onDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = String(over.id);
    const leadId = String(active.id);
    const lead = (kanbanData?.items || []).find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    const res = await apiPut(`/api/leads/${leadId}`, { status: newStatus });
    if (res.ok) {
      toast.success("وضعیت لید به‌روزرسانی شد.");
      refetchKanban();
    } else {
      toast.error(res.error || "خطا در جابجایی.");
    }
  }

  // Group by status
  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of LEAD_STATUSES) map[s.value] = [];
    for (const l of kanbanData?.items || []) {
      if (map[l.status]) map[l.status].push(l);
    }
    return map;
  }, [kanbanData]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="لیدها"
        subtitle="مدیریت لیدها و قیف فروش"
        icon={<UserPlus className="size-5" />}
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <UserPlus className="size-4 ml-1" />
              لید جدید
            </Button>
          )
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
        <TabsList>
          <TabsTrigger value="kanban">
            <LayoutGrid className="size-4 ml-1" />
            کانبان
          </TabsTrigger>
          <TabsTrigger value="list">
            <ListIcon className="size-4 ml-1" />
            لیست
          </TabsTrigger>
        </TabsList>

        {/* Kanban */}
        <TabsContent value="kanban">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="mb-3">
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="جستجو در لیدها…"
                  className="max-w-md"
                />
              </div>
              {kanbanLoading ? (
                <LoadingState rows={6} />
              ) : kanbanErr ? (
                <ErrorState message={kanbanErr} onRetry={refetchKanban} />
              ) : !kanbanData || kanbanData.items.length === 0 ? (
                <EmptyState
                  title="لیدی ثبت نشده است"
                  icon={<UserPlus className="size-7" />}
                  action={canCreate && <Button onClick={openCreate}><UserPlus className="size-4 ml-1" />لید جدید</Button>}
                />
              ) : (
                <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                  <div className="overflow-x-auto custom-scroll pb-2">
                    <div className="flex gap-3 min-w-max">
                      {LEAD_STATUSES.map((s) => (
                        <KanbanColumn
                          key={s.value}
                          status={s.value}
                          label={s.label}
                          leads={grouped[s.value] || []}
                          canUpdate={canUpdate}
                          canDelete={canDelete}
                          onEdit={openEdit}
                          onDelete={(l) => setConfirmDelete(l)}
                          onConvert={convertToPatient}
                          onPatientClick={(id) => setPage("patient-detail", { id })}
                        />
                      ))}
                    </div>
                  </div>
                  <DragOverlay>
                    {activeDrag ? (
                      <div className="rounded-xl bg-card border border-border/70 shadow-md p-3 w-64 rotate-2 opacity-90">
                        <LeadCardBody lead={activeDrag} />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* List */}
        <TabsContent value="list">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="جستجو…"
                  className="flex-1 min-w-[200px]"
                />
                <Select value={status} onValueChange={(v) => { setStatus(v); setPageNum(1); }}>
                  <SelectTrigger className="sm:w-40 bg-background"><Filter className="size-4 ml-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={source} onValueChange={(v) => { setSource(v); setPageNum(1); }}>
                  <SelectTrigger className="sm:w-36 bg-background"><SelectValue placeholder="منبع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه منابع</SelectItem>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={assignedToId} onValueChange={(v) => { setAssignedToId(v); setPageNum(1); }}>
                  <SelectTrigger className="sm:w-40 bg-background"><SelectValue placeholder="مسئول" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه مسئولین</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
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
                <EmptyState title="لیدی یافت نشد" icon={<UserPlus className="size-7" />} />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-right font-medium p-3">نام</th>
                          <th className="text-right font-medium p-3">موبایل</th>
                          <th className="text-right font-medium p-3">منبع</th>
                          <th className="text-right font-medium p-3">علاقه</th>
                          <th className="text-right font-medium p-3">مسئول</th>
                          <th className="text-right font-medium p-3">وضعیت</th>
                          <th className="text-right font-medium p-3">ایجاد</th>
                          <th className="text-left font-medium p-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {listData.items.map((l) => (
                          <tr key={l.id} className="hover:bg-muted/30">
                            <td className="p-3 font-medium">
                              {l.patientId ? (
                                <button className="text-primary hover:underline" onClick={() => setPage("patient-detail", { id: l.patientId! })}>
                                  {l.firstName} {l.lastName}
                                </button>
                              ) : `${l.firstName} ${l.lastName}`}
                            </td>
                            <td className="p-3" dir="ltr">{l.mobile ? toPersianDigits(l.mobile) : "—"}</td>
                            <td className="p-3">{l.source ? <StatusBadge status={l.source} /> : "—"}</td>
                            <td className="p-3 text-muted-foreground">{l.interest || "—"}</td>
                            <td className="p-3 text-muted-foreground">{l.assignedTo?.name || "—"}</td>
                            <td className="p-3"><StatusBadge status={l.status} /></td>
                            <td className="p-3 text-xs text-muted-foreground">{formatRelativeTime(l.createdAt)}</td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8"><MoreVertical className="size-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canUpdate && <DropdownMenuItem onClick={() => openEdit(l)}><Edit className="size-4 ml-2" /> ویرایش</DropdownMenuItem>}
                                  {canUpdate && !l.patientId && <DropdownMenuItem onClick={() => convertToPatient(l)}><ArrowRightLeft className="size-4 ml-2" /> تبدیل به مراجع</DropdownMenuItem>}
                                  {canDelete && <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmDelete(l)}><Trash2 className="size-4 ml-2" /> حذف</DropdownMenuItem>}
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
                    {listData.items.map((l) => (
                      <div key={l.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-sm">{l.firstName} {l.lastName}</div>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1" dir="ltr">{l.mobile ? toPersianDigits(l.mobile) : "—"}</div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {l.source && <StatusBadge status={l.source} />}
                          {l.interest && <span className="flex items-center gap-1"><Sparkles className="size-3" />{l.interest}</span>}
                        </div>
                        {l.assignedTo && <div className="text-xs mt-1">مسئول: {l.assignedTo.name}</div>}
                      </div>
                    ))}
                  </div>

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

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        users={users}
        onSaved={() => { setFormOpen(false); refetchKanban(); refetchList(); }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="حذف لید"
        description={`آیا از حذف لید «${confirmDelete?.firstName} ${confirmDelete?.lastName}» مطمئن هستید؟`}
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------- Kanban Column ----------------

function KanbanColumn({
  status, label, leads, canUpdate, canDelete, onEdit, onDelete, onConvert, onPatientClick,
}: {
  status: string;
  label: string;
  leads: Lead[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  onConvert: (l: Lead) => void;
  onPatientClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="w-64 shrink-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">{toPersianDigits(leads.length)}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[60vh] p-2 rounded-xl space-y-2 transition-colors ${isOver ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30"}`}
      >
        {leads.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">خالی</div>
        ) : (
          leads.map((l) => (
            <KanbanCard
              key={l.id}
              lead={l}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
              onConvert={onConvert}
              onPatientClick={onPatientClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  lead, canUpdate, canDelete, onEdit, onDelete, onConvert, onPatientClick,
}: {
  lead: Lead;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  onConvert: (l: Lead) => void;
  onPatientClick: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-xl bg-card border border-border/70 p-3 shadow-sm cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <LeadCardBody lead={lead} />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs text-muted-foreground">{formatRelativeTime(lead.createdAt)}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7"><MoreVertical className="size-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canUpdate && <DropdownMenuItem onClick={() => onEdit(lead)}><Edit className="size-4 ml-2" /> ویرایش</DropdownMenuItem>}
            {canUpdate && !lead.patientId && <DropdownMenuItem onClick={() => onConvert(lead)}><ArrowRightLeft className="size-4 ml-2" /> تبدیل به مراجع</DropdownMenuItem>}
            {lead.patientId && <DropdownMenuItem onClick={() => onPatientClick(lead.patientId!)}><Sparkles className="size-4 ml-2" /> مشاهده پرونده</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem className="text-rose-600" onClick={() => onDelete(lead)}><Trash2 className="size-4 ml-2" /> حذف</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function LeadCardBody({ lead }: { lead: Lead }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="font-medium text-sm flex-1 truncate">
          {lead.firstName} {lead.lastName}
        </div>
        {lead.source && <StatusBadge status={lead.source} />}
      </div>
      {lead.mobile && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1" dir="ltr">
          <Phone className="size-3" />
          {toPersianDigits(lead.mobile)}
        </div>
      )}
      {lead.interest && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Sparkles className="size-3" />
          {lead.interest}
        </div>
      )}
      {lead.assignedTo && (
        <div className="text-xs text-muted-foreground mt-1">مسئول: {lead.assignedTo.name}</div>
      )}
    </div>
  );
}

// ---------------- LeadFormDialog ----------------

function LeadFormDialog({
  open, onOpenChange, editing, users, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Lead | null;
  users: UserOpt[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", mobile: "", source: "walk_in",
    interest: "", status: "new", notes: "", assignedToId: "",
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
          source: editing.source || "walk_in",
          interest: editing.interest || "",
          status: editing.status,
          notes: editing.notes || "",
          assignedToId: editing.assignedToId || "",
        });
      } else {
        setForm({
          firstName: "", lastName: "", mobile: "", source: "walk_in",
          interest: "", status: "new", notes: "", assignedToId: "",
        });
      }
      setErrors({});
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const body = { ...form, assignedToId: form.assignedToId || undefined };
    const res = editing
      ? await apiPut(`/api/leads/${editing.id}`, body)
      : await apiPost("/api/leads", body);
    if (res.ok) {
      toast.success(editing ? "لید به‌روزرسانی شد." : "لید جدید ثبت شد.");
      onSaved();
    } else if (res.errors) {
      setErrors(res.errors);
    } else {
      toast.error(res.error || "خطا در ثبت لید.");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش لید" : "لید جدید"}</DialogTitle>
          <DialogDescription>اطلاعات لید را وارد کنید.</DialogDescription>
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
            <FormField label="موبایل" error={errors.mobile} hint="۱۱ رقم با ۰۹">
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} dir="ltr" className="text-left" placeholder="0912xxxxxxx" />
            </FormField>
            <FormField label="منبع">
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="علاقه / خدمت موردنظر">
            <Input value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} placeholder="مثلاً: لیزر، بوتاکس، ویزیت…" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="وضعیت">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="مسئول پیگیری">
              <Select value={form.assignedToId} onValueChange={(v) => setForm({ ...form, assignedToId: v })}>
                <SelectTrigger className="bg-background w-full"><SelectValue placeholder="بدون مسئول" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون مسئول</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="یادداشت">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ثبت…" : editing ? "ذخیره تغییرات" : "ثبت لید"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
