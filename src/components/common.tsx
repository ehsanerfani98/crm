"use client";

import { type ReactNode, useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, Inbox, AlertCircle } from "lucide-react";
import { toJalaali } from "jalaali-js";
import { toPersianDigits } from "@/lib/persian";

// ---------------- PageHeader ----------------

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ---------------- StatCard ----------------

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  trend?: { value: string; up: boolean };
  tone?: "default" | "success" | "warning" | "destructive" | "info";
}) {
  const tones: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    destructive: "bg-rose-500/10 text-rose-600",
    info: "bg-sky-500/10 text-sky-600",
  };
  return (
    <div className="rounded-2xl bg-card border border-border/70 p-4 sm:p-5 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-muted-foreground">{label}</div>
        {icon && (
          <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", tones[tone])}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tabular tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend && (
          <span className={cn("font-medium", trend.up ? "text-emerald-600" : "text-rose-600")}>
            {trend.up ? "▲" : "▼"} {trend.value}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

// ---------------- SearchInput ----------------

export function SearchInput({
  value,
  onChange,
  placeholder = "جستجو…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9 bg-background"
      />
    </div>
  );
}

// ---------------- EmptyState ----------------

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
        {icon ?? <Inbox className="size-7" />}
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------- LoadingState ----------------

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

// ---------------- ErrorState ----------------

export function ErrorState({
  message = "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="size-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
        <AlertCircle className="size-7" />
      </div>
      <h3 className="font-semibold text-base mb-1">خطا</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          تلاش مجدد
        </Button>
      )}
    </div>
  );
}

// ---------------- ConfirmDialog ----------------

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  variant = "default",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setLoading(false);
              }
            }}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {loading ? "در حال انجام…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------- StatusBadge ----------------

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  // Appointments
  booked: { label: "رزرو شده", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  confirmed: { label: "تأیید شده", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  waiting: { label: "در انتظار", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  in_progress: { label: "در حال مراجعه", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  done: { label: "انجام شده", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
  cancelled: { label: "لغو شده", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  no_show: { label: "عدم مراجعه", className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },

  // Patients
  active: { label: "فعال", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  inactive: { label: "غیرفعال", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
  blacklisted: { label: "بلاک شده", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },

  // Leads
  new: { label: "جدید", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  contacted: { label: "تماس گرفته شد", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  interested: { label: "علاقه‌مند", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  visited: { label: "مراجعه کرد", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  customer: { label: "مشتری", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  lost: { label: "از دست رفت", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },

  // Tasks
  pending: { label: "در انتظار", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  in_progress: { label: "در حال انجام", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },

  // Payments
  paid: { label: "پرداخت شده", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  refunded: { label: "بازگشت داده شده", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },

  // Generic
  urgent: { label: "فوری", className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  high: { label: "بالا", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  medium: { label: "متوسط", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  low: { label: "پایین", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },

  // Payment methods
  cash: { label: "نقدی", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  card: { label: "کارت", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  transfer: { label: "انتقال", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  online: { label: "آنلاین", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },

  // Sources
  referral: { label: "معرفی", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  instagram: { label: "اینستاگرام", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  walk_in: { label: "مراجعه حضوری", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  call: { label: "تماس", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  website: { label: "وب‌سایت", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },

  // Gender
  male: { label: "مرد", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  female: { label: "زن", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  other: { label: "سایر", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
};

export function StatusBadge({ status, customLabel }: { status: string; customLabel?: string }) {
  const s = STATUS_STYLES[status];
  if (!s) return <Badge variant="outline">{customLabel ?? status}</Badge>;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", s.className)}>
      {customLabel ?? s.label}
    </span>
  );
}

// ---------------- PersianDatePicker ----------------
// Native input with Jalali conversion; shows Persian date as helper text.

export function PersianDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
}: {
  value?: string; // ISO date string
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const display = (() => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const j = toJalaali(d);
    return toPersianDigits(`${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`);
  })();

  return (
    <div className={cn("space-y-1", className)}>
      <Input
        type="date"
        value={value ? value.slice(0, 10) : ""}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        className="bg-background"
      />
      {display && <p className="text-xs text-muted-foreground">{display}</p>}
    </div>
  );
}

// ---------------- PersianDateTimePicker ----------------

export function PersianDateTimePicker({
  value,
  onChange,
  className,
}: {
  value?: string;
  onChange: (iso: string) => void;
  className?: string;
}) {
  const display = (() => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const j = toJalaali(d);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return toPersianDigits(`${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")} - ${hh}:${mm}`);
  })();

  const localValue = (() => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <div className={cn("space-y-1", className)}>
      <Input
        type="datetime-local"
        value={localValue}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        className="bg-background"
      />
      {display && <p className="text-xs text-muted-foreground">{display}</p>}
    </div>
  );
}

// ---------------- FormField ----------------

export function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------- useFetch hook ----------------

export function useFetch<T>(url: string | null, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url, options)
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setError(json.error || "خطا در دریافت اطلاعات");
          setData(null);
        } else {
          setData(json.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("اتصال به سرور برقرار نشد.");
          setData(null);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refetchKey]);

  return {
    data,
    error,
    loading,
    refetch: () => setRefetchKey((k) => k + 1),
  };
}

// ---------------- apiPost helper ----------------

export async function apiPost<T = unknown>(url: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: string; errors?: Record<string, string> }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await r.json();
    return json;
  } catch {
    return { ok: false, error: "اتصال به سرور برقرار نشد." };
  }
}

export async function apiPut<T = unknown>(url: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: string; errors?: Record<string, string> }> {
  try {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await r.json();
    return json;
  } catch {
    return { ok: false, error: "اتصال به سرور برقرار نشد." };
  }
}

export async function apiDelete<T = unknown>(url: string): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const r = await fetch(url, { method: "DELETE" });
    const json = await r.json();
    return json;
  } catch {
    return { ok: false, error: "اتصال به سرور برقرار نشد." };
  }
}

// ---------------- Card ----------------

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-card border border-border/70", className)}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 p-4 sm:p-5 border-b border-border/60">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}
