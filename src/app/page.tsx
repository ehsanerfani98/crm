"use client";

import { useEffect, useState } from "react";
import { useAuthStore, useNav, initNavFromUrl } from "@/lib/store";
import { LoginScreen } from "@/components/login-screen";
import { AppShell } from "@/components/app-shell";
import { DashboardPage } from "@/components/pages/dashboard";
import { PatientsListPage } from "@/components/pages/patients-list";
import { PatientDetailPage } from "@/components/pages/patient-detail";
import { AppointmentsPage } from "@/components/pages/appointments";
import { LeadsPage } from "@/components/pages/leads";
import { TasksPage } from "@/components/pages/tasks";
import { FinancialPage } from "@/components/pages/financial";
import { ServicesPage } from "@/components/pages/services";
import { StaffPage } from "@/components/pages/staff";
import { ReportsPage } from "@/components/pages/reports";
import { SettingsPage } from "@/components/pages/settings";
import { AuditPage } from "@/components/pages/audit";
import { ProfilePage } from "@/components/pages/profile";
import { NotificationsPage } from "@/components/pages/notifications";
import { Loader2 } from "lucide-react";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const page = useNav((s) => s.page);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    initNavFromUrl();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data?.user) {
          setUser(j.data.user);
        } else {
          logout();
        }
      })
      .catch(() => logout())
      .finally(() => setBootstrapping(false));
  }, [setUser, logout]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AppShell>
      <PageRouter page={page} />
    </AppShell>
  );
}

function PageRouter({ page }: { page: string }) {
  switch (page) {
    case "dashboard": return <DashboardPage />;
    case "patients": return <PatientsListPage />;
    case "patient-detail": return <PatientDetailPage />;
    case "appointments": return <AppointmentsPage />;
    case "leads": return <LeadsPage />;
    case "tasks": return <TasksPage />;
    case "financial": return <FinancialPage />;
    case "services": return <ServicesPage />;
    case "staff": return <StaffPage />;
    case "reports": return <ReportsPage />;
    case "settings": return <SettingsPage />;
    case "audit": return <AuditPage />;
    case "profile": return <ProfilePage />;
    case "notifications": return <NotificationsPage />;
    default: return <DashboardPage />;
  }
}
