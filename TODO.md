# 📋 فهرست تسک‌های انجام‌نشده (TODO)

این سند بر اساس مقایسه دقیق PRD اولیه با وضعیت فعلی پروژه تهیه شده است.
پروژه در حال حاضر حدود **۸۵٪ از PRD** را پوشش می‌دهد. موارد زیر برای تکمیل محصول production-ready باقی‌مانده‌اند.

> آخرین به‌روزرسانی: ۱۴۰۵/۰۶/۲۵

---

## 🔴 اولویت بالا (نقص جدی در PRD)

### ۱. صفحات Authentication ناقص
**الزامات PRD:** Login | Forgot Password | Reset Password

- [ ] صفحه **Forgot Password** (درخواست بازنشانی گذرواژه)
- [ ] صفحه **Reset Password** (تنظیم گذرواژه جدید با توکن)
- [ ] API `/api/auth/forgot-password` (تولید توکن، ارسال ایمیل)
- [ ] API `/api/auth/reset-password` (اعتبارسنجی توکن، تنظیم گذرواژه جدید)
- [ ] مدل `PasswordReset` در Prisma schema (توکن، انقضا، استفاده‌شده)
- [ ] ادغام با سرویس ایمیل برای ارسال لینک بازنشانی

**فایل‌های مرتبط:**
- `src/components/login-screen.tsx` (افزودن لینک "فراموشی گذرواژه")
- `src/app/api/auth/` (ایجاد routes جدید)

---

### ۲. Dark Mode ناقص
**الزامات PRD:** "معماری UI را طوری طراحی کن که در آینده Dark Mode به راحتی اضافه شود"

- [x] متغیرهای CSS برای `.dark` تعریف شده (در `globals.css`)
- [x] `ThemeProvider` در `providers.tsx` نصب است
- [ ] **دکمه Toggle در TopBar** برای تغییر theme
- [ ] persist کردن انتخاب کاربر در localStorage
- [ ] تست همه componentها در حالت dark (بررسی contrast رنگ‌ها)
- [ ] پشتیبانی از `prefers-color-scheme` به‌صورت پیش‌فرض

**فایل‌های مرتبط:**
- `src/components/app-shell.tsx` (افزودن دکمه در TopBar)
- `src/components/providers.tsx` (تنظیم `enableSystem`)

---

### ۳. Settings: مدیریت کاربران و نقش‌ها
**الزامات PRD:** User Settings | Roles Permissions

- [ ] API `/api/users` با متدهای GET (لیست)، POST (ایجاد)، PUT (ویرایش)، DELETE (حذف)
- [ ] API `/api/users/[id]/roles` برای تخصیص نقش‌ها
- [ ] API `/api/users/[id]/reset-password` برای مدیر
- [ ] صفحه **ایجاد کاربر جدید** (نام، ایمیل، نقش، وضعیت)
- [ ] صفحه **ویرایش کاربر** (تغییر نام، ایمیل، نقش‌ها، suspend/activate)
- [ ] امکان تغییر نقش کاربر (assign/revoke roles) در UI
- [ ] جلوگیری از حذف آخرین admin
- [ ] Audit log برای همه عملیات مدیریت کاربر

**فایل‌های مرتبط:**
- `src/app/api/settings/route.ts` (یا ایجاد `src/app/api/users/route.ts` جداگانه)
- `src/components/pages/settings.tsx` (تب کاربران)

---

### ۴. Rate Limiting وجود ندارد
**الزامات PRD صریح:** "Rate Limiting"

- [ ] Middleware برای محدودسازی درخواست‌ها در Next.js
- [ ] محدودسازی `/api/auth/login` (مثلاً ۵ تلاش در ۱۵ دقیقه از هر IP)
- [ ] محدودسازی `/api/auth/forgot-password` (۳ درخواست در ساعت)
- [ ] محدودسازی APIهای write برای جلوگیری از spam
- [ ] پاسخ HTTP 429 با header `Retry-After`
- [ ] ذخیره شمارش در memory (یا Redis در آینده)

**فایل‌های مرتبط:**
- ایجاد `src/lib/rate-limit.ts`
- ایجاد `src/middleware.ts` (Next.js middleware)

---

### ۵. گزارش‌های ناقص
**الزامات PRD:** Patient Reports | Appointment Reports | Financial Reports

- ✅ گزارش مالی (`/api/reports/financial`) پیاده‌سازی شده
- [ ] **گزارش مراجعین:**
  - تعداد مراجعین فعال/غیرفعال
  - نرخ بازگشت مراجعین
  - نمودار رشد مراجعین در طول زمان
  - مراجعین برتر (بر اساس تعداد نوبت/درآمد)
- [ ] **گزارش نوبت‌ها:**
  - نوبت‌ها به تفکیک پزشک
  - نوبت‌ها به تفکیک خدمت
  - نوبت‌ها به تفکیک وضعیت
  - نرخ عدم مراجعه (no_show rate)
  - نمودار نوبت‌ها در طول هفته/ماه
- [ ] **داشبورد گزارش‌ها** (صفحه Reports Dashboard) که هر سه گزارش را یکجا نمایش دهد

**فایل‌های مرتبط:**
- ایجاد `src/app/api/reports/patients/route.ts`
- ایجاد `src/app/api/reports/appointments/route.ts`
- گسترش `src/components/pages/reports.tsx`

---

### ۶. Offline Mode ناقص
**الزامات PRD:** "عملیات حساس که نیاز به Server دارند باید وضعیت اتصال را به کاربر اعلام کنند"

- [x] Service Worker cache و fallback دارد
- [ ] **Indicator بصری Online/Offline** در TopBar
- [ ] Toast هوشمند هنگام قطع اینترنت
- [ ] دکمه Retry هوشمند در `ErrorState` وقتی offline است
- [ ] صف کردن درخواست‌های write هنگام offline (Background Sync API)
- [ ] نمایش پیام "در حال offline" در footer/form ها

**فایل‌های مرتبط:**
- `src/components/app-shell.tsx` (افزودن indicator)
- ایجاد `src/hooks/use-online-status.ts`
- `src/components/common.tsx` (بهبود `ErrorState`)

---

## 🟡 اولویت متوسط (نقص در UX یا معماری)

### ۷. Lead Profile Detail Page
**الزامات PRD:** Lead Profile

- [x] Kanban view و List view داریم
- [ ] صفحه **پروفایل تک‌تک لیدها** با:
  - اطلاعات اصلی lead
  - تاریخچه تماس‌ها (call log)
  - یادداشت‌های متعدد
  - conversion history (lead → patient)
  - timeline تعاملات
- [ ] Navigation از Kanban/List به صفحه پروفایل
- [ ] API `/api/leads/[id]` با GET که شامل history باشد

**فایل‌های مرتبط:**
- ایجاد `src/components/pages/lead-detail.tsx`
- اضافه‌کردن case در `src/app/page.tsx`

---

### ۸. Global Search محدود
**الزامات PRD:** "در آینده امکان Global Search نیز در نظر گرفته شود"

- [x] Search در Patients موجود است
- [ ] **Global Search** که در همه entityها بگردد:
  - Patients (نام، موبایل، کد ملی، کد پرونده)
  - Appointments (نام بیمار، تاریخ)
  - Leads (نام، موبایل)
  - Payments (مرجع، نام بیمار)
  - Tasks (عنوان، توضیحات)
- [ ] **Command Palette** (Cmd+K / Ctrl+K) برای جستجوی سریع
- [ ] نمایش نتایج گروه‌بندی‌شده بر اساس نوع entity
- [ ] Keyboard navigation در نتایج

**فایل‌های مرتبط:**
- ایجاد `src/app/api/search/route.ts`
- ایجاد `src/components/command-palette.tsx`
- `src/components/app-shell.tsx` (افزودن shortcut listener)

---

### ۹. Follow-up در Leads
**الزامات PRD:** "Follow-up" به‌عنوان یکی از امکانات CRM

- [ ] فیلد `nextFollowUpAt` در مدل Lead
- [ ] فیلد `lastContactedAt` در مدل Lead
- [ ] فرم ثبت تماس (call log) در پروفایل lead
- [ ] یادآوری follow-up در Dashboard (لیدهایی که باید امروز تماس گرفته شوند)
- [ ] فیلتر "نیاز به follow-up" در Kanban/List
- [ ] API `/api/leads/[id]/calls` برای ثبت تماس

**فایل‌های مرتبط:**
- `prisma/schema.prisma` (افزودن فیلدها)
- `src/app/api/leads/route.ts` (به‌روزرسانی)
- `src/components/pages/leads.tsx`
- `src/components/pages/dashboard.tsx` (افزودن widget)

---

### ۱۰. CSRF Protection صریح
**الزامات PRD:** "CSRF Protection"

- [x] Next.js درخواست‌های same-origin را مدیریت می‌کند
- [x] Cookies با `sameSite: "lax"` تنظیم شده
- [ ] توکن CSRF صریح برای APIهای state-changing
- [ ] header `X-CSRF-Token` در همه فرم‌ها
- [ ] middleware برای verify کردن توکن CSRF

> در عمل با SameSite=Lax امن است، ولی PRD صریحاً درخواست کرده

**فایل‌های مرتبط:**
- ایجاد `src/lib/csrf.ts`
- `src/middleware.ts`

---

### ۱۱. Accessibility (a11y) ناقص
**الزامات PRD:** aria, Keyboard Navigation, Focus State, Label مناسب

- [x] semantic HTML (main, header, nav)
- [x] shadcn/ui خودش aria را رعایت می‌کند
- [ ] تست keyboard navigation در همه صفحات
- [ ] Focus trap در Modalها (جلوگیری از tab به خارج از modal)
- [ ] Screen reader testing با NVDA/VoiceOver
- [ ] aria-live برای toast notification ها
- [ ] Skip-to-content link در ابتدای صفحه
- [ ] بررسی contrast ratio (حداقل 4.5:1 برای متن)

**فایل‌های مرتبط:**
- همه فایل‌های `src/components/`

---

### ۱۲. Splash/Loading Experience ضعیف
**الزامات PRD:** "splash/loading experience"

- [x] Loader ساده در ابتدای bootstrap
- [ ] Splash screen مخصوص PWA برای زمان راه‌اندازی اپ (به‌خصوص موبایل)
- [ ] App-like loading skeleton قبل از render کامل
- [ ] انیمیشن logo در حین بارگذاری اولیه
- [ ] PWA splash screen با رنگ برند

**فایل‌های مرتبط:**
- `public/manifest.json` (افزودن `screenshots`, `shortcuts`)
- `src/app/layout.tsx` (loading template)
- ایجاد `src/app/loading.tsx`

---

### ۱۳. بهینه‌سازی Performance
**الزامات PRD:** Lazy Loading در Frontend، Cache

- [x] Pagination در همه APIها
- [x] Eager Loading مناسب (با `_count` و `include`)
- [ ] Lazy loading صفحه‌ها (حذف شده برای پایداری، باید با روش بهتر برگردد)
- [ ] Cache layer برای queries تکراری (مثل services list، staff list)
- [ ] stale-while-revalidate برای داده‌های کم‌تغییر (services، settings)
- [ ] Bundle analyzer برای کاهش حجم JavaScript
- [ ] Image optimization برای آیکون‌ها و آواتارها

**فایل‌های مرتبط:**
- `src/app/page.tsx` (بازگرداندن lazy imports با `next/dynamic`)
- `src/lib/store.ts` یا ایجاد cache helpers

---

## 🟢 اولویت پایین (موارد "در آینده" طبق PRD)

### ۱۴. کانال‌های Notification اضافه نشدند
**الزامات PRD:** SMS | Email | Push | WhatsApp — "در آینده"

- [x] معماری `notify()` در `src/lib/audit.ts` آماده
- [ ] driver برای SMS (کاوه‌نگار / فراز SMS / ملی پیامک)
- [ ] Email sender (SMTP / Resend / SendGrid)
- [ ] Web Push (Push API + VAPID keys)
- [ ] WhatsApp Business API
- [ ] تنظیمات per-user برای کانال‌های دلخواه
- [ ] صف ارسال (queue) برای retry

**فایل‌های مرتبط:**
- ایجاد `src/lib/notifications/` با زیرمجموعه‌های sms, email, push, whatsapp
- `src/app/api/settings/route.ts` (افزودن تب notification channels)

---

### ۱۵. Multi-tenant (SaaS) Architecture
**الزامات PRD:** "معماری آن قابلیت توسعه به SaaS در آینده را داشته باشد"

- [x] Schema طوری طراحی شده که اضافه‌کردن `tenantId` ساده است
- [ ] فیلد `tenantId` واقعاً در مدل‌ها اضافه شود
- [ ] مدل `Tenant` (کلینیک‌ها)
- [ ] middleware برای tenant isolation (هر کاربر فقط داده‌های tenant خودش را ببیند)
- [ ] signup flow برای tenant جدید
- [ ] super-admin برای مدیریت tenant ها
- [ ] برنامه‌سازی قیمت‌گذاری (pricing plans)

> برای فاز ۱ مشکلی نیست

**فایل‌های مرتبط:**
- `prisma/schema.prisma` (افزودن `tenantId` به همه مدل‌ها)
- ایجاد `src/lib/tenant.ts`
- `src/middleware.ts`

---

### ۱۶. کمپین‌های بازاریابی (Campaigns)
**الزامات PRD:** "کمپین‌های بازاریابی در آینده"

- [ ] مدل `Campaign` در schema (نام، منبع، بودجه، تاریخ شروع/پایان)
- [ ] امکان نسبت دادن lead به کمپین
- [ ] گزارش ROI کمپین‌ها (تعداد lead → patient → درآمد)
- [ ] UTM tracking برای ورودی‌های وب‌سایت

> PRD صریحاً گفته "در آینده" - مهم نیست

---

## 📊 خلاصه آماری

| دسته | تعداد |
|------|------|
| ✅ موارد کامل | **۲۰** |
| 🔴 موارد با اولویت بالا | **۶** |
| 🟡 موارد با اولویت متوسط | **۷** |
| 🟢 موارد با اولویت پایین ("در آینده") | **۳** |
| **موارد باقی‌مانده واقعی** | **۱۳** |

---

## 🚀 پیشنهاد فازبندی اجرایی

### فاز ۲ — Production-Ready (۱-۲ روز توسعه)
1. Forgot/Reset Password (auth کامل)
2. Dark Mode toggle در TopBar
3. API مدیریت کاربران (`/api/users` CRUD)
4. Rate Limiting middleware (به‌خصوص برای login)
5. Online/Offline indicator در UI

### فاز ۳ — تکمیل CRM (۲-۳ روز توسعه)
6. گزارش مراجعین و نوبت‌ها
7. Lead Profile Detail Page
8. Global Search با Cmd+K
9. Lead Follow-up سیستم
10. بهبود Accessibility

### فاز ۴ — آینده (طبق PRD)
11. SMS/Email/Push notifications
12. Multi-tenant SaaS
13. Campaigns
14. صف ارسال notification

---

## 📝 نکات فنی

- **Database:** SQLite — آماده مهاجرت به MySQL/PostgreSQL (تنها `DATABASE_URL` تغییر می‌کند)
- **Auth:** Session-based با bcrypt + httpOnly cookie — برای SaaS باید به JWT با tenant claim تغییر کند
- **RBAC:** ۵ نقش و ۳۰ دسترسی — برای SaaS باید per-tenant باشد
- **Audit Log:** آماده برای هر entity — کافی است `audit()` فراخوانی شود

---

> این سند را پس از تکمیل هر تسک به‌روزرسانی کنید و تیک بزنید.
