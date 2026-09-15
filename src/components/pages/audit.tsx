"use client";

import { useState, useMemo } from "react";
import {
  PageHeader, Card, CardContent, EmptyState, LoadingState,
  ErrorState, useFetch, PersianDatePicker,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck, Filter, ChevronLeft,
} from "lucide-react";
import { toPersianDigits, formatDate, formatTime } from "@/lib/persian";

type AuditItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  payload: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

type ListResp = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type UserOpt = { id: string; name: string; email: string };

const ACTION_LABEL: Record<string, string> = {
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  login: "ورود",
  logout: "خروج",
  convert: "تبدیل",
};

const ACTION_COLOR: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  update: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  delete: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  login: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  logout: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  convert: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

const ENTITY_LABEL: Record<string, string> = {
  patient: "مراجع",
  appointment: "نوبت",
  payment: "پرداخت",
  lead: "لید",
  task: "وظیفه",
  service: "خدمت",
  staff: "کارکنان",
  user: "کاربر",
  setting: "تنظیمات",
};

export function AuditPage() {
  const [userId, setUserId] = useState("all");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditItem | null>(null);

  const { data: settingsData } = useFetch<{ users?: UserOpt[] }>(`/api/settings?include=users`);
  const users = settingsData?.users || [];

  const query = useMemo(() => {
    const sp = new URLSearchParams({
      userId, entity, action, from, to,
      page: String(page), pageSize: "20",
    });
    return `/api/audit?${sp.toString()}`;
  }, [userId, entity, action, from, to, page]);

  const { data, error, loading, refetch } = useFetch<ListResp>(query);

  return (
    <div className="space-y-4">
      <PageHeader
        title="لاگ ممیزی"
        subtitle="تاریخچه عملیات کاربران در سامانه"
        icon={<ShieldCheck className="size-5" />}
      />

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Select value={userId} onValueChange={(v) => { setUserId(v); setPage(1); }}>
              <SelectTrigger className="sm:w-40 bg-background"><Filter className="size-4 ml-1 text-muted-foreground" /><SelectValue placeholder="کاربر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کاربران</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1); }}>
              <SelectTrigger className="sm:w-36 bg-background"><SelectValue placeholder="موجودیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه موجودیت‌ها</SelectItem>
                {Object.entries(ENTITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
              <SelectTrigger className="sm:w-32 bg-background"><SelectValue placeholder="عملیات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه عملیات</SelectItem>
                {Object.entries(ACTION_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <PersianDatePicker value={from} onChange={(v) => { setFrom(v); setPage(1); }} placeholder="از تاریخ" />
              <PersianDatePicker value={to} onChange={(v) => { setTo(v); setPage(1); }} placeholder="تا تاریخ" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState rows={8} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState title="رویدادی ثبت نشده است" icon={<ShieldCheck className="size-7" />} />
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-right font-medium p-3">زمان</th>
                      <th className="text-right font-medium p-3">کاربر</th>
                      <th className="text-right font-medium p-3">عملیات</th>
                      <th className="text-right font-medium p-3">موجودیت</th>
                      <th className="text-right font-medium p-3">شناسه</th>
                      <th className="text-right font-medium p-3">IP</th>
                      <th className="text-left font-medium p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.items.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(a)}>
                        <td className="p-3 text-xs whitespace-nowrap">{formatDate(a.createdAt)} {formatTime(a.createdAt)}</td>
                        <td className="p-3 font-medium">{a.user?.name || "—"}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[a.action] || "bg-muted text-muted-foreground"}`}>
                            {ACTION_LABEL[a.action] || a.action}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{ENTITY_LABEL[a.entity] || a.entity}</td>
                        <td className="p-3 text-xs font-mono text-muted-foreground">{a.entityId ? toPersianDigits(a.entityId.slice(-6)) : "—"}</td>
                        <td className="p-3 text-xs font-mono text-muted-foreground" dir="ltr">{a.ip || "—"}</td>
                        <td className="p-3">
                          <ChevronLeft className="size-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border/60">
                {data.items.map((a) => (
                  <div key={a.id} className="p-3" onClick={() => setDetail(a)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{a.user?.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(a.createdAt)} {formatTime(a.createdAt)}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[a.action] || "bg-muted"}`}>
                        {ACTION_LABEL[a.action] || a.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{ENTITY_LABEL[a.entity] || a.entity}</span>
                      {a.ip && <span dir="ltr">• {a.ip}</span>}
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
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</Button>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
          <DialogHeader>
            <DialogTitle>جزئیات رویداد</DialogTitle>
            <DialogDescription>
              {detail ? `${formatDate(detail.createdAt)} ${formatTime(detail.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">کاربر</div>
                  <div className="font-medium">{detail.user?.name || "—"}</div>
                  {detail.user?.email && <div className="text-xs text-muted-foreground" dir="ltr">{detail.user.email}</div>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">عملیات</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[detail.action] || "bg-muted"}`}>
                    {ACTION_LABEL[detail.action] || detail.action}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">موجودیت</div>
                  <div className="font-medium">{ENTITY_LABEL[detail.entity] || detail.entity}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">شناسه</div>
                  <div className="font-mono text-xs" dir="ltr">{detail.entityId || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">IP</div>
                  <div className="font-mono text-xs" dir="ltr">{detail.ip || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">User Agent</div>
                  <div className="text-xs text-muted-foreground truncate" dir="ltr">{detail.userAgent || "—"}</div>
                </div>
              </div>
              {detail.payload && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">محتوای رویداد</div>
                  <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-x-auto custom-scroll" dir="ltr">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(detail.payload), null, 2);
                      } catch {
                        return detail.payload;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
