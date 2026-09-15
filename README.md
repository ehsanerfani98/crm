# سامانه مدیریت کلینیک | CRM درمانگاه

یک CRM فارسی، مدرن و حرفه‌ای برای مدیریت کامل ارتباط با مراجعین/بیماران و فرآیندهای کلینیک و مطب.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-indigo) ![TailwindCSS](https://img.shields.io/badge/Tailwind-4-cyan) ![PWA](https://img.shields.io/badge/PWA-Installable-purple)

## ✨ ویژگی‌ها

- 🎯 **داشبورد یک‌نگاهی:** آمار امروز، درآمد، نوبت‌های پیش رو، فعالیت‌های اخیر
- 👥 **مدیریت مراجعین:** پرونده کامل با Timeline، یادداشت‌ها، سوابق نوبت و پرداخت
- 📅 **نوبت‌دهی:** تقویم شمسی (Calendar View) + لیست، تغییر وضعیت سریع
- 🎯 **مدیریت لیدها:** Kanban Board با Drag & Drop، تبدیل لید به مراجع
- ✅ **وظایف و یادآوری:** گروه‌بندی بر اساس وضعیت/اولویت/تاریخ
- 💰 **مالی:** ثبت پرداخت، گزارش درآمد، فیلتر پیشرفته
- 🩺 **خدمات و کارکنان:** مدیریت پزشکان و خدمات قابل ارائه
- 📊 **گزارش‌ها:** نمودار درآمد روزانه، سهم روش‌های پرداخت، خدمات پربازده
- 🔔 **اعلان‌ها:** سیستم اعلان درون‌برنامه‌ای
- 🔐 **امنیت:** RBAC با ۵ نقش و ۳۰ دسترسی، Audit Log، session امن
- 📱 **PWA:** قابل نصب روی موبایل/تبلت/دسکتاپ با تجربه Native
- 🌙 **RTL فارسی:** فونت Vazirmatn، تاریخ شمسی، اعداد فارسی

## 🛠 تکنولوژی‌ها

| لایه | تکنولوژی |
|------|----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui, Lucide icons |
| State | Zustand, TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Next.js API Routes (RESTful) |
| Database | Prisma ORM + SQLite (قابل مهاجرت به MySQL/PostgreSQL) |
| Auth | Session-based با bcrypt + httpOnly cookie |
| PWA | manifest.json + Service Worker |

## 📋 پیش‌نیازها

- Node.js 18+ یا [Bun](https://bun.sh)
- SQLite (به صورت پیش‌فرض همراه Prisma)

## 🚀 نصب و راه‌اندازی

```bash
# 1. نصب وابستگی‌ها
bun install

# 2. کپی فایل env
cp .env.example .env

# 3. اعمال schema روی دیتابیس
bun run db:push

# 4. اجرای seed برای داده‌های اولیه (نقش‌ها، دسترسی‌ها، کاربران نمونه)
bun run db:seed

# 5. اجرای سرور توسعه
bun run dev
```

سپس به آدرس http://localhost:3000 مراجعه کنید.

## 🔐 حساب‌های آزمایشی

گذرواژه همه: `password`

| نقش | ایمیل |
|-----|------|
| مدیر کل | `admin@clinic.local` |
| پزشک | `doctor@clinic.local` |
| منشی | `secretary@clinic.local` |
| اپراتور | `operator@clinic.local` |
| حسابدار | `accountant@clinic.local` |

## 📂 ساختار پروژه

```
├── prisma/
│   └── schema.prisma          # اسکیمای دیتابیس (۱۷ مدل)
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── icon-192.png
│   └── icon-512.png
├── scripts/
│   └── seed.ts                # داده‌های اولیه
├── src/
│   ├── app/
│   │   ├── api/               # API Routes (RESTful)
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── patients/
│   │   │   ├── appointments/
│   │   │   ├── leads/
│   │   │   ├── tasks/
│   │   │   ├── services/
│   │   │   ├── staff/
│   │   │   ├── payments/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   ├── globals.css        # استایل‌های پایه + RTL + فونت فارسی
│   │   ├── layout.tsx         # Layout اصلی با RTL و Vazirmatn
│   │   └── page.tsx           # Router اصلی SPA
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── pages/             # صفحات CRM (۱۴ صفحه)
│   │   ├── app-shell.tsx      # Sidebar + TopBar + BottomNav
│   │   ├── common.tsx         # Design System مشترک
│   │   ├── login-screen.tsx
│   │   └── providers.tsx      # Theme + Query providers
│   └── lib/
│       ├── api.ts             # helpers پاسخ‌های API
│       ├── auth.ts            # session + bcrypt
│       ├── audit.ts           # audit log + activity
│       ├── db.ts              # Prisma client
│       ├── permissions.ts     # RBAC catalog
│       ├── persian.ts         # تاریخ شمسی + اعداد فارسی
│       ├── store.ts           # Zustand stores
│       └── utils.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## 🗄 مدل‌های دیتابیس

`User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Patient`, `Staff`, `Service`, `ServiceStaff`, `Appointment`, `Payment`, `Lead`, `Task`, `Note`, `Activity`, `Notification`, `AuditLog`, `Setting`

## 🔐 امنیت

- **احراز هویت:** Session-based با bcrypt hash و httpOnly cookie
- **授权 (Authorization):** RBAC با ۵ نقش (admin, doctor, secretary, operator, accountant) و ۳۰ دسترسی
- **Audit Log:** ثبت تمام عملیات حساس (ایجاد/ویرایش/حذف/ورود)
- **محافظت:** SQL Injection (Prisma), Mass Assignment (Zod validation), CSRF, XSS
- **Rate Limiting:** قابل افزودن در لایه middleware

## 📱 PWA

- قابل نصب روی Android/iOS/Desktop
- Service Worker برای offline-first
- آیکون و manifest RTL فارسی
- Splash screen و theme color

## 🎨 Design System

- **Color Palette:** Teal/Emerald (روی پس‌زمینه روشن/تیره)
- **Typography:** Vazirmatn (فارسی) + Geist Mono
- **Components:** Card, Modal, Drawer, Dropdown, Tabs, Badge, Toast, DataTable, EmptyState, LoadingState, ErrorState, ConfirmDialog, PersianDatePicker, PersianDateTimePicker
- **Mobile-First:** Bottom Navigation در موبایل، Sidebar در دسکتاپ

## 🌐 محلی‌سازی

- کاملاً RTL
- تاریخ شمسی (Jalali) در تمام بخش‌ها
- اعداد فارسی در UI
- پیام‌های خطا و موفقیت فارسی
- اعتبارسنجی فرم‌ها فارسی

## 🛣 نقشه راه

- [ ] Dark Mode toggle
- [ ] SMS/Email/Push notifications
- [ ] گزارش‌های پیشرفته‌تر
- [ ] چت درون‌برنامه‌ای با مراجعین
- [ ] whatsApp integration
- [ ] ماژول انبار و دارو
- [ ] ماژول صندوق و حسابداری پیشرفته
- [ ] مهاجرت به MySQL/PostgreSQL
- [ ] multi-tenant (SaaS)

## 📜 لایسنس

MIT License
