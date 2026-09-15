"use client";

import { useMemo, useState } from "react";
import {
  PageHeader, Card, CardContent, EmptyState, LoadingState,
  ErrorState, useFetch, apiPost,
} from "@/components/common";
import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, BellOff, CheckCheck, CheckCircle2 } from "lucide-react";
import { toPersianDigits, formatRelativeTime, formatDate, formatTime } from "@/lib/persian";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

type ListResp = {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
};

const TYPE_LABEL: Record<string, string> = {
  appointment: "نوبت",
  task: "وظیفه",
  payment: "پرداخت",
  lead: "لید",
  system: "سیستم",
};

const TYPE_COLOR: Record<string, string> = {
  appointment: "bg-sky-500/10 text-sky-600",
  task: "bg-amber-500/10 text-amber-600",
  payment: "bg-emerald-500/10 text-emerald-600",
  lead: "bg-violet-500/10 text-violet-600",
  system: "bg-slate-500/10 text-slate-600",
};

// Map page names from link string in API response. Notifications link is the
// page key like "appointments", "patient-detail?id=...", etc.
function parseLink(link?: string | null): { page: string; params?: Record<string, string> } | null {
  if (!link) return null;
  const [page, qs] = link.split("?");
  const params: Record<string, string> = {};
  if (qs) {
    for (const pair of qs.split("&")) {
      const [k, v] = pair.split("=");
      if (k && v) params[k] = v;
    }
  }
  return { page, params };
}

export function NotificationsPage() {
  const setPage = useNav((s) => s.setPage);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPageNum] = useState(1);

  const query = useMemo(() => {
    return `/api/notifications?filter=${filter}&page=${page}&pageSize=20`;
  }, [filter, page]);

  const { data, error, loading, refetch } = useFetch<ListResp>(query);

  async function markAllRead() {
    const res = await apiPost("/api/notifications/read", {});
    if (res.ok) {
      toast.success("همه اعلان‌ها خوانده شدند.");
      refetch();
    } else {
      toast.error(res.error || "خطا در به‌روزرسانی.");
    }
  }

  async function markOne(n: Notification) {
    if (!n.read) {
      await apiPost(`/api/notifications/${n.id}/read`, {});
    }
    const link = parseLink(n.link);
    if (link) {
      // The link page must be a known PageKey; we trust the API to send valid links.
      setPage(link.page as never, link.params);
    } else {
      refetch();
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title="اعلان‌ها"
        subtitle={data ? `${toPersianDigits(data.unreadCount)} اعلان خوانده‌نشده` : "اعلان‌های سیستم"}
        icon={<Bell className="size-5" />}
        actions={
          data && data.unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="size-4 ml-1" />
              خواندن همه
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-3 sm:p-4">
          <Select value={filter} onValueChange={(v) => { setFilter(v as "all" | "unread"); setPageNum(1); }}>
            <SelectTrigger className="sm:w-40 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه اعلان‌ها</SelectItem>
              <SelectItem value="unread">خوانده‌نشده</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState rows={6} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="اعلانی وجود ندارد"
              description="در صورت ثبت رویداد جدید، اعلان‌ها اینجا نمایش داده می‌شوند."
              icon={<BellOff className="size-7" />}
            />
          ) : (
            <>
              <div className="divide-y divide-border/60">
                {data.items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markOne(n)}
                    className={`w-full flex items-start gap-3 p-3 sm:p-4 text-right hover:bg-muted/30 transition ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${TYPE_COLOR[n.type] || TYPE_COLOR.system}`}>
                      <Bell className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm flex-1">{n.title}</div>
                        {!n.read && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>{TYPE_LABEL[n.type] || n.type}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(n.createdAt)}</span>
                        <span>•</span>
                        <span dir="ltr">{formatDate(n.createdAt)} {formatTime(n.createdAt)}</span>
                      </div>
                    </div>
                    {n.read && <CheckCircle2 className="size-4 text-muted-foreground shrink-0 mt-1" />}
                  </button>
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
    </div>
  );
}
