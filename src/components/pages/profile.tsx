"use client";

import { useMemo } from "react";
import {
  PageHeader, Card, CardHeader, CardContent, EmptyState, LoadingState,
  ErrorState, StatusBadge, FormField, useFetch,
} from "@/components/common";
import { useAuthStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity as ActivityIcon, User as UserIcon, Mail, Phone, KeyRound, Clock } from "lucide-react";
import { toPersianDigits, formatDate, formatTime, formatRelativeTime } from "@/lib/persian";
import { toast } from "sonner";

type AuditItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

const ACTION_LABEL: Record<string, string> = {
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  login: "ورود",
  logout: "خروج",
  convert: "تبدیل",
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

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const auditQuery = useMemo(() => `/api/audit?userId=${user?.id || ""}&page=1&pageSize=20`, [user?.id]);
  const { data, error, loading } = useFetch<{ items: AuditItem[]; total: number }>(auditQuery);

  if (!user) return <EmptyState title="کاربر یافت نشد" />;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageHeader title="پروفایل من" subtitle="اطلاعات حساب کاربری" icon={<UserIcon className="size-5" />} />

      {/* Profile header */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="size-20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {user.name.split(" ").slice(0, 2).map((p) => p.charAt(0)).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-right">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mt-1" dir="ltr">
                <Mail className="size-4" />
                {user.email}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                {user.roles.map((r) => (
                  <span key={r} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {ROLE_LABELS[r] || r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Edit profile */}
        <Card>
          <CardHeader title="ویرایش اطلاعات" subtitle="نام و شماره تماس" />
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                toast.info("این قابلیت به‌زودی اضافه خواهد شد.");
              }}
            >
              <FormField label="نام کامل">
                <Input defaultValue={user.name} />
              </FormField>
              <FormField label="ایمیل">
                <Input defaultValue={user.email} dir="ltr" className="text-left" disabled />
              </FormField>
              <FormField label="شماره تماس">
                <Input defaultValue="" dir="ltr" className="text-left" placeholder="0912xxxxxxx" />
              </FormField>
              <Button type="submit" disabled>
                ذخیره تغییرات
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader title="تغییر رمز عبور" subtitle="رمز عبور حساب کاربری" />
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                toast.info("این قابلیت به‌زودی اضافه خواهد شد.");
              }}
            >
              <FormField label="رمز عبور فعلی">
                <Input type="password" dir="ltr" className="text-left" />
              </FormField>
              <FormField label="رمز عبور جدید">
                <Input type="password" dir="ltr" className="text-left" />
              </FormField>
              <FormField label="تکرار رمز عبور جدید">
                <Input type="password" dir="ltr" className="text-left" />
              </FormField>
              <Button type="submit" disabled>
                <KeyRound className="size-4 ml-1" />
                تغییر رمز
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Activity log */}
      <Card>
        <CardHeader title="فعالیت‌های اخیر" subtitle="۲۰ رویداد آخر شما" />
        <CardContent className="p-0">
          {loading ? (
            <LoadingState rows={5} />
          ) : error ? (
            <ErrorState message={error} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState title="فعالیتی ثبت نشده است" icon={<ActivityIcon className="size-6" />} />
          ) : (
            <div className="divide-y divide-border/60">
              {data.items.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3">
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ActivityIcon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{ACTION_LABEL[a.action] || a.action}</span>
                      {" — "}
                      <span className="text-muted-foreground">{ENTITY_LABEL[a.entity] || a.entity}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(a.createdAt)} • {formatDate(a.createdAt)} {formatTime(a.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
