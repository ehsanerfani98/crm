"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/common";
import { apiPost } from "@/components/common";
import { useAuthStore } from "@/lib/store";
import { CalendarHeart, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LoginScreen() {
  const [email, setEmail] = useState("admin@clinic.local");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await apiPost<{ user: unknown }>("/api/auth/login", { email, password });
    setLoading(false);
    if (res.ok && res.data) {
      setUser(res.data.user as never);
      toast.success("خوش آمدید!");
    } else {
      setError(res.error || "ورود ناموفق بود.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="w-full max-w-sm fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <CalendarHeart className="size-8" />
          </div>
          <h1 className="text-2xl font-bold">سامانه مدیریت کلینیک</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت یکپارچه مراجعین، نوبت‌ها و مالی</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ایمیل</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.local"
                  required
                  autoComplete="email"
                  
                  className="text-left"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">گذرواژه</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  
                  className="text-left"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin ml-1" />}
                ورود به سامانه
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-3 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground mb-2">حساب‌های آزمایشی (گذرواژه همه: <code className="font-mono">password</code>)</div>
          <ul className="space-y-1 leading-relaxed">
            <li><span className="font-mono" >admin@clinic.local</span> — مدیر کل</li>
            <li><span className="font-mono" >doctor@clinic.local</span> — پزشک</li>
            <li><span className="font-mono" >secretary@clinic.local</span> — منشی</li>
            <li><span className="font-mono" >operator@clinic.local</span> — اپراتور</li>
            <li><span className="font-mono" >accountant@clinic.local</span> — حسابدار</li>
          </ul>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          سامانه مدیریت کلینیک نسخه ۱.۰ — PWA قابل نصب
        </p>
      </div>
    </div>
  );
}
