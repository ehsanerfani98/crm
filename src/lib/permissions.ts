/**
 * Permissions catalog and helpers.
 * Each permission is namespaced by entity: action.
 */
export const PERMISSIONS = [
  // Patients
  { name: "patients.view", label: "مشاهده مراجعین", group: "patients" },
  { name: "patients.create", label: "ایجاد مراجع", group: "patients" },
  { name: "patients.update", label: "ویرایش مراجع", group: "patients" },
  { name: "patients.delete", label: "حذف مراجع", group: "patients" },
  // Appointments
  { name: "appointments.view", label: "مشاهده نوبت‌ها", group: "appointments" },
  { name: "appointments.create", label: "ایجاد نوبت", group: "appointments" },
  { name: "appointments.update", label: "ویرایش نوبت", group: "appointments" },
  { name: "appointments.delete", label: "حذف نوبت", group: "appointments" },
  // Leads
  { name: "leads.view", label: "مشاهده لیدها", group: "leads" },
  { name: "leads.create", label: "ایجاد لید", group: "leads" },
  { name: "leads.update", label: "ویرایش لید", group: "leads" },
  { name: "leads.delete", label: "حذف لید", group: "leads" },
  // Tasks
  { name: "tasks.view", label: "مشاهده وظایف", group: "tasks" },
  { name: "tasks.create", label: "ایجاد وظیفه", group: "tasks" },
  { name: "tasks.update", label: "ویرایش وظیفه", group: "tasks" },
  { name: "tasks.delete", label: "حذف وظیفه", group: "tasks" },
  // Financial
  { name: "financial.view", label: "مشاهده مالی", group: "financial" },
  { name: "financial.create", label: "ثبت پرداخت", group: "financial" },
  { name: "financial.update", label: "ویرایش پرداخت", group: "financial" },
  { name: "financial.delete", label: "حذف پرداخت", group: "financial" },
  // Services
  { name: "services.view", label: "مشاهده خدمات", group: "services" },
  { name: "services.manage", label: "مدیریت خدمات", group: "services" },
  // Staff
  { name: "staff.view", label: "مشاهده کارکنان", group: "staff" },
  { name: "staff.manage", label: "مدیریت کارکنان", group: "staff" },
  // Reports
  { name: "reports.view", label: "مشاهده گزارش‌ها", group: "reports" },
  // Settings
  { name: "settings.view", label: "مشاهده تنظیمات", group: "settings" },
  { name: "settings.manage", label: "مدیریت تنظیمات", group: "settings" },
  // Users & RBAC
  { name: "users.view", label: "مشاهده کاربران", group: "users" },
  { name: "users.manage", label: "مدیریت کاربران", group: "users" },
  { name: "audit.view", label: "مشاهده لاگ ممیزی", group: "audit" },
] as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: PERMISSIONS.map((p) => p.name),
  doctor: [
    "patients.view", "patients.create", "patients.update",
    "appointments.view", "appointments.create", "appointments.update", "appointments.delete",
    "tasks.view", "tasks.create", "tasks.update",
    "services.view", "staff.view",
    "reports.view",
  ],
  secretary: [
    "patients.view", "patients.create", "patients.update",
    "appointments.view", "appointments.create", "appointments.update", "appointments.delete",
    "leads.view", "leads.create", "leads.update",
    "tasks.view", "tasks.create", "tasks.update",
    "financial.view", "financial.create",
    "services.view", "staff.view",
    "reports.view",
  ],
  operator: [
    "patients.view", "patients.create", "patients.update",
    "leads.view", "leads.create", "leads.update",
    "appointments.view", "appointments.create", "appointments.update",
    "tasks.view", "tasks.create", "tasks.update",
  ],
  accountant: [
    "patients.view",
    "appointments.view",
    "financial.view", "financial.create", "financial.update", "financial.delete",
    "reports.view",
    "services.view",
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر کل",
  doctor: "پزشک",
  secretary: "منشی",
  operator: "اپراتور",
  accountant: "حسابدار",
};

export function hasPermission(
  user: { roles: string[]; permissions: string[] } | null,
  perm: string,
): boolean {
  if (!user) return false;
  if (user.roles.includes("admin")) return true;
  return user.permissions.includes(perm);
}
