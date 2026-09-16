"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useNav, useAuthStore, type PageKey } from "@/lib/store";
import { hasPermission } from "@/lib/permissions";
import { apiPost } from "@/components/common";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserPlus,
  CheckSquare,
  Wallet,
  Stethoscope,
  UserCog,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Search,
  Menu,
  X,
  ShieldCheck,
  CalendarHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ROLE_LABELS } from "@/lib/permissions";
import { toPersianDigits } from "@/lib/persian";

type NavItem = {
  key: PageKey;
  label: string;
  icon: ReactNode;
  perm?: string;
  mobile?: boolean; // shown on bottom nav
};

const NAV: NavItem[] = [
  { key: "dashboard", label: "داشبورد", icon: <LayoutDashboard className="size-5" />, mobile: true },
  { key: "patients", label: "مراجعین", icon: <Users className="size-5" />, perm: "patients.view", mobile: true },
  { key: "appointments", label: "نوبت‌ها", icon: <CalendarDays className="size-5" />, perm: "appointments.view", mobile: true },
  { key: "leads", label: "لیدها", icon: <UserPlus className="size-5" />, perm: "leads.view" },
  { key: "tasks", label: "وظایف", icon: <CheckSquare className="size-5" />, perm: "tasks.view", mobile: true },
  { key: "financial", label: "مالی", icon: <Wallet className="size-5" />, perm: "financial.view" },
  { key: "services", label: "خدمات", icon: <Stethoscope className="size-5" />, perm: "services.view" },
  { key: "staff", label: "کارکنان", icon: <UserCog className="size-5" />, perm: "staff.view" },
  { key: "reports", label: "گزارش‌ها", icon: <BarChart3 className="size-5" />, perm: "reports.view" },
  { key: "audit", label: "لاگ ممیزی", icon: <ShieldCheck className="size-5" />, perm: "audit.view" },
  { key: "settings", label: "تنظیمات", icon: <Settings className="size-5" />, perm: "settings.view" },
];

const PAGE_TITLES: Record<PageKey, string> = {
  dashboard: "داشبورد",
  patients: "مراجعین",
  "patient-detail": "پرونده مراجع",
  appointments: "نوبت‌ها",
  leads: "لیدها",
  tasks: "وظایف",
  financial: "مالی",
  services: "خدمات",
  staff: "کارکنان",
  reports: "گزارش‌ها",
  settings: "تنظیمات",
  audit: "لاگ ممیزی",
  notifications: "اعلان‌ها",
  profile: "پروفایل",
};

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const page = useNav((s) => s.page);
  const setPage = useNav((s) => s.setPage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");

  // Fetch notifications periodically
  useEffect(() => {
    let active = true;
    async function fetchNotifs() {
      try {
        const r = await fetch("/api/notifications?pageSize=5");
        const j = await r.json();
        if (active && j.ok) {
          setNotifications(j.data.items);
          setUnreadCount(j.data.unreadCount || 0);
        }
      } catch { /* ignore */ }
    }
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const filteredNav = NAV.filter((n) => !n.perm || hasPermission(user, n.perm));
  const bottomNav = filteredNav.filter((n) => n.mobile).slice(0, 5);

  async function handleLogout() {
    await apiPost("/api/auth/logout", {});
    logout();
    toast.success("با موفقیت خارج شدید.");
  }

  async function markAllRead() {
    await apiPost("/api/notifications/read", {});
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function initials(name: string) {
    return name.split(" ").slice(0, 2).map((p) => p.charAt(0)).join("");
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    setPage("patients", { q: globalSearch.trim() });
    setGlobalSearch("");
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-l border-border bg-sidebar sticky top-0 h-screen">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <CalendarHeart className="size-5" />
            </div>
            <div>
              <div className="font-bold text-sm">CRM کلینیک</div>
              <div className="text-xs text-muted-foreground">سامانه مدیریت</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scroll p-3 space-y-1">
          {filteredNav.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                page === item.key || (item.key === "patients" && page === "patient-detail")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="size-5" />
            <span>خروج</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border safe-top">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            {/* Mobile: hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-5 border-b border-border">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                      <CalendarHeart className="size-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">CRM کلینیک</div>
                      <div className="text-xs text-muted-foreground">سامانه مدیریت</div>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-3 space-y-1">
                  {filteredNav.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        setPage(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        page === item.key
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-500/10"
                  >
                    <LogOut className="size-5" />
                    <span>خروج</span>
                  </button>
                </nav>
              </SheetContent>
            </Sheet>

            <h1 className="text-base sm:text-lg font-bold">{PAGE_TITLES[page]}</h1>

            {/* Search */}
            <form onSubmit={onSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-2">
              <div className="relative w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="جستجوی مراجع، شماره موبایل، کد ملی…"
                  className="pr-9 bg-muted/40 border-transparent focus-visible:bg-background h-9"
                />
              </div>
            </form>

            <div className="flex items-center gap-1.5 mr-auto">
              {/* Notifications */}
              <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="font-semibold text-sm">اعلان‌ها</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                        خواندن همه
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scroll">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        اعلانی وجود ندارد.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                          <div className="flex items-center gap-2 w-full">
                            {!n.read && <span className="size-2 rounded-full bg-primary shrink-0" />}
                            <span className="font-medium text-sm flex-1">{n.title}</span>
                          </div>
                          {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {user ? initials(user.name) : "؟"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs font-semibold">{user?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user?.roles.map((r) => ROLE_LABELS[r] || r).join("، ")}
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.name}</span>
                      <span className="text-xs text-muted-foreground font-normal" dir="ltr">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPage("profile")}>
                    <UserCog className="size-4 ml-2" />
                    پروفایل من
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPage("settings")}>
                    <Settings className="size-4 ml-2" />
                    تنظیمات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-700">
                    <LogOut className="size-4 ml-2" />
                    خروج از سامانه
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 fade-in" key={page + JSON.stringify(useNav.getState().params)}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border safe-bottom">
          <div className="grid grid-cols-5 h-16">
            {bottomNav.map((item) => (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors relative",
                  page === item.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {page === item.key && (
                  <span className="absolute top-0 inset-x-3 h-0.5 bg-primary rounded-full" />
                )}
                {item.icon}
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
};
