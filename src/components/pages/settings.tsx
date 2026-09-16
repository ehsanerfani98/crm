"use client";

import { useState, useEffect } from "react";
import {
  PageHeader, Card, CardContent, EmptyState, LoadingState,
  ErrorState, StatusBadge, FormField, useFetch, apiPut,
} from "@/components/common";
import { useAuthStore } from "@/lib/store";
import { hasPermission, ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings as SettingsIcon, Building2, Users, Shield, Bell,
} from "lucide-react";
import { toPersianDigits, formatRelativeTime, formatDate } from "@/lib/persian";
import { toast } from "sonner";

type Clinic = {
  name: string;
  phone: string;
  address: string;
  workingHours: string;
  currency: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  roles: Array<{ role: { id: string; name: string; label: string } }>;
};

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState("clinic");

  const canManageSettings = hasPermission(user, "settings.manage");
  const canViewUsers = hasPermission(user, "users.view");
  const canManageUsers = hasPermission(user, "users.manage");
  const canViewAudit = hasPermission(user, "audit.view");

  // Fetch clinic settings
  const settingsUrl = canViewUsers ? `/api/settings?include=users` : `/api/settings`;
  const { data, error, loading, refetch } = useFetch<{ clinic: Clinic; users?: UserRow[] }>(settingsUrl);

  if (loading) return <LoadingState rows={6} />;
  if (error || !data) return <ErrorState message={error || "خطا"} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="تنظیمات"
        subtitle="پیکربندی سامانه و کاربران"
        icon={<SettingsIcon className="size-5" />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="clinic"><Building2 className="size-4 ml-1" /> اطلاعات کلینیک</TabsTrigger>
          {canViewUsers && <TabsTrigger value="users"><Users className="size-4 ml-1" /> کاربران</TabsTrigger>}
          {canViewAudit && <TabsTrigger value="roles"><Shield className="size-4 ml-1" /> نقش‌ها و دسترسی‌ها</TabsTrigger>}
          <TabsTrigger value="notif"><Bell className="size-4 ml-1" /> اعلان‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic">
          <ClinicTab clinic={data.clinic} canManage={canManageSettings} onSaved={refetch} />
        </TabsContent>

        {canViewUsers && (
          <TabsContent value="users">
            <UsersTab users={data.users || []} canManage={canManageUsers} onSaved={refetch} />
          </TabsContent>
        )}

        {canViewAudit && (
          <TabsContent value="roles">
            <RolesTab canManage={canManageUsers} />
          </TabsContent>
        )}

        <TabsContent value="notif">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- ClinicTab ----------------

function ClinicTab({ clinic, canManage, onSaved }: { clinic: Clinic; canManage: boolean; onSaved: () => void }) {
  const [form, setForm] = useState<Clinic>(clinic);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(clinic); }, [clinic]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await apiPut("/api/settings", form);
    if (res.ok) {
      toast.success("اطلاعات کلینیک ذخیره شد.");
      onSaved();
    } else {
      toast.error(res.error || "خطا در ذخیره‌سازی.");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="نام کلینیک">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canManage} />
            </FormField>
            <FormField label="تلفن">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canManage}  className="text-left" />
            </FormField>
          </div>
          <FormField label="آدرس">
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} disabled={!canManage} />
          </FormField>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="ساعات کاری">
              <Input value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} disabled={!canManage} />
            </FormField>
            <FormField label="واحد پول">
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })} disabled={!canManage}>
                <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="toman">تومان</SelectItem>
                  <SelectItem value="rial">ریال</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          {canManage && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</Button>
            </div>
          )}
          {!canManage && (
            <div className="text-xs text-muted-foreground text-center p-3 rounded-md bg-muted/30">
              شما فقط اجازه مشاهده دارید.
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------- UsersTab ----------------

function UsersTab({ users, canManage, onSaved }: { users: UserRow[]; canManage: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState<UserRow | null>(null);

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState title="کاربری ثبت نشده است" icon={<Users className="size-7" />} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium p-3">نام</th>
                      <th className="text-right font-medium p-3">ایمیل</th>
                      <th className="text-right font-medium p-3">تلفن</th>
                      <th className="text-right font-medium p-3">نقش‌ها</th>
                      <th className="text-right font-medium p-3">آخرین ورود</th>
                      <th className="text-right font-medium p-3">وضعیت</th>
                      <th className="text-left font-medium p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {u.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs" >{u.email}</td>
                        <td className="p-3 text-xs" >{u.phone ? toPersianDigits(u.phone) : "—"}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {r.role.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : "—"}</td>
                        <td className="p-3"><StatusBadge status={u.status} /></td>
                        <td className="p-3">
                          {canManage && (
                            <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>ویرایش</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border/60">
                {users.map((u) => (
                  <div key={u.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{u.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-sm">{u.name}</div>
                          <div className="text-xs text-muted-foreground" >{u.email}</div>
                        </div>
                      </div>
                      <StatusBadge status={u.status} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {u.roles.map((r, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {r.role.label}
                        </span>
                      ))}
                    </div>
                    {canManage && (
                      <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setEditing(u)}>ویرایش</Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {editing && (
        <UserEditDialog user={editing} onOpenChange={(v) => !v && setEditing(null)} onSaved={() => { setEditing(null); onSaved(); }} />
      )}
    </>
  );
}

function UserEditDialog({ user, onOpenChange, onSaved }: { user: UserRow; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "", status: user.status, roles: user.roles.map((r) => r.role.name) });
  const [saving, setSaving] = useState(false);

  function toggleRole(name: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(name) ? f.roles.filter((r) => r !== name) : [...f.roles, name],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Note: API for editing users does not exist per spec. This is a UI placeholder.
    toast.info("این قابلیت به‌زودی اضافه خواهد شد. کاربران از طریق seed اضافه می‌شوند.");
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ویرایش کاربر</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="نام">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="تلفن">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}  className="text-left" />
          </FormField>
          <FormField label="وضعیت">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-background w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="نقش‌ها">
            <div className="space-y-2 border border-border rounded-md p-2">
              {Object.entries(ROLE_LABELS).map(([name, label]) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted/40">
                  <Checkbox checked={form.roles.includes(name)} onCheckedChange={() => toggleRole(name)} />
                  <span className="text-sm flex-1">{label}</span>
                  <span className="text-xs text-muted-foreground">{toPersianDigits(ROLE_PERMISSIONS[name]?.length || 0)} دسترسی</span>
                </label>
              ))}
            </div>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- RolesTab ----------------

type RoleRow = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  permissions: string[];
};

type RolesResp = {
  roles: RoleRow[];
  catalog: Array<{ name: string; label: string; group: string }>;
};

function RolesTab({ canManage }: { canManage: boolean }) {
  const { data, error, loading, refetch } = useFetch<RolesResp>("/api/roles");
  const [selected, setSelected] = useState<string>("");
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const roles = data?.roles || [];
  const catalog = data?.catalog || [];

  // Derive the active role: fall back to the first role until the user picks one.
  const current = roles.find((r) => r.name === selected) || roles[0] || null;

  // The draft is null until the user edits; otherwise it mirrors the saved set.
  const effectiveDraft = draft ?? current?.permissions ?? [];

  const groupedPerms = catalog.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {} as Record<string, RolesResp["catalog"]>);

  const groupLabels: Record<string, string> = {
    patients: "مراجعین", appointments: "نوبت‌ها", leads: "لیدها", tasks: "وظایف",
    financial: "مالی", services: "خدمات", staff: "کارکنان", reports: "گزارش‌ها",
    settings: "تنظیمات", users: "کاربران", audit: "ممیزی",
  };

  const isAdminRole = current?.name === "admin";
  const editable = canManage && !isAdminRole;
  const dirty =
    !!current &&
    (effectiveDraft.length !== current.permissions.length ||
      effectiveDraft.some((p) => !current.permissions.includes(p)));

  function selectRole(name: string) {
    setSelected(name);
    setDraft(null); // discard any unsaved edits when switching roles
  }

  function togglePerm(name: string) {
    if (!editable) return;
    setDraft((d) => {
      const base = d ?? current?.permissions ?? [];
      return base.includes(name) ? base.filter((x) => x !== name) : [...base, name];
    });
  }

  async function handleSave() {
    if (!current || !editable) return;
    setSaving(true);
    const res = await apiPut("/api/roles", { roleId: current.id, permissions: effectiveDraft });
    if (res.ok) {
      toast.success("دسترسی‌های نقش به‌روزرسانی شد.");
      refetch();
    } else {
      toast.error(res.error || "خطا در ذخیره دسترسی‌ها.");
    }
    setSaving(false);
  }

  if (loading) return <LoadingState rows={5} />;
  if (error || !data) return <ErrorState message={error || "خطا"} onRetry={refetch} />;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Role list */}
      <Card className="lg:col-span-1">
        <CardContent className="p-3">
          <div className="space-y-1">
            {roles.map((r) => {
              const count = r.permissions.length;
              return (
                <button
                  key={r.name}
                  onClick={() => selectRole(r.name)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition ${current?.name === r.name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <span className="font-medium">{r.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${current?.name === r.name ? "bg-primary-foreground/20" : "bg-muted"}`}>
                    {toPersianDigits(count)} دسترسی
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permissions detail */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold">
              دسترسی‌های نقش: {current?.label || "—"}
            </h3>
            {editable && (
              <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
                {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
              </Button>
            )}
          </div>

          {isAdminRole && (
            <p className="text-xs text-muted-foreground mb-3">
              نقش «مدیر کل» به‌صورت پیش‌فرض به همه دسترسی‌ها دسترسی دارد و قابل تغییر نیست.
            </p>
          )}
          {!canManage && !isAdminRole && (
            <p className="text-xs text-muted-foreground mb-3">
              برای ویرایش دسترسی‌ها به مجوز «مدیریت کاربران» نیاز دارید.
            </p>
          )}

          <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scroll">
            {Object.entries(groupedPerms).map(([group, perms]) => (
              <div key={group}>
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  {groupLabels[group] || group}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {perms.map((p) => {
                    const has = effectiveDraft.includes(p.name);
                    return (
                      <label
                        key={p.name}
                        className={`flex items-center gap-2 p-2 rounded-md ${editable ? "cursor-pointer hover:bg-muted/50" : ""} ${has ? "bg-emerald-500/10" : "bg-muted/30 opacity-60"}`}
                      >
                        <Checkbox
                          checked={has}
                          disabled={!editable}
                          onCheckedChange={() => togglePerm(p.name)}
                        />
                        <span className="text-sm flex-1">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- NotificationsTab ----------------

function NotificationsTab() {
  const [settings, setSettings] = useState({
    appointment_reminder: true,
    task_reminder: true,
    payment_receipt: true,
    lead_followup: true,
    system: true,
    email: false,
  });

  const labels: Record<string, string> = {
    appointment_reminder: "یادآوری نوبت‌ها",
    task_reminder: "یادآوری وظایف",
    payment_receipt: "رسید پرداخت",
    lead_followup: "پیگیری لیدها",
    system: "اعلان‌های سیستمی",
    email: "دریافت اعلان‌ها از طریق ایمیل",
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <h3 className="font-semibold mb-3">تنظیمات اعلان‌ها</h3>
        <p className="text-xs text-muted-foreground mb-4">نوع اعلان‌هایی که می‌خواهید دریافت کنید را انتخاب کنید.</p>
        <div className="space-y-2">
          {Object.keys(labels).map((key) => (
            <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer">
              <Checkbox
                checked={settings[key as keyof typeof settings]}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, [key]: !!v }))}
              />
              <span className="text-sm flex-1">{labels[key]}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => toast.info("تنظیمات اعلان‌ها در نسخه‌های بعدی اعمال خواهد شد.")}>
            ذخیره تنظیمات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
