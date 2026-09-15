---
Task ID: 2-api
Agent: full-stack-developer
Task: Build remaining API routes for CRM

Work Log:
- Read prisma/schema.prisma, src/lib/{api,auth,permissions,audit,persian}.ts and the existing reference routes (patients, appointments) to match conventions exactly.
- Created /api/leads (GET list with status/source/q/assignedToId filters + pagination; POST create with mobile validation).
- Created /api/leads/[id] (PUT update + DELETE + special `convertToPatient` action that generates P-XXXX patient code, copies firstName/lastName/mobile/source, links lead.patientId, sets lead.status="customer", writes audit + activity; also handles the case where lead.mobile already exists on a patient by linking rather than duplicating).
- Created /api/tasks (GET list with status/priority/assignedToId/patientId/q filters, ordered by dueDate asc; POST create with title required, createdById = session user).
- Created /api/tasks/[id] (PUT partial update, DELETE).
- Created /api/services (GET list all with optional status/category filter; includes staff + appointment count; POST create with name/price validation, optional staffIds link).
- Created /api/services/[id] (PUT update with optional `staffIds` sync — deleteMany + createMany; DELETE).
- Created /api/staff (GET list with type/status/q filters; includes user + services; POST create with name/type validation, mobile/email format checks, userId uniqueness check).
- Created /api/staff/[id] (GET single with services + appointment count; PUT partial update; DELETE).
- Created /api/payments (GET list with patientId/method/status/from/to/q filters + pagination + aggregate summary of paid revenue/discount; POST create with patient existence check, audit + recordActivity on patient with type="payment").
- Created /api/payments/[id] (PUT partial update with status-change activity; DELETE).
- Created /api/notifications (GET current user's notifications paginated, sorted by createdAt desc, includes unreadCount).
- Created /api/notifications/read (POST marks all unread notifications of current user as read via updateMany).
- Created /api/notifications/[id]/read (POST marks a single notification as read; ownership-checked).
- Created /api/settings (GET returns clinic Setting JSON; `?include=users` adds users list with roles (requires users.view); PUT updates clinic name/phone/address/workingHours/currency — requires settings.manage; upserts Setting key="clinic").
- Created /api/audit (GET with pagination, filters by userId/entity/action/from/to — requires audit.view).
- Created /api/reports/financial (GET — from/to default to current Jalali month; returns totalRevenue, totalDiscount, totalCount, byMethod [{method,count,total}], byDay [{date,total}] for chart, topServices [{serviceName,count,total}] joined via appointment.service; requires reports.view).
- All routes use withErrorHandler wrapper, getSession for auth, hasPermission for authz, ok/fail/notFound/forbidden/unauthorized/validationError responses, and audit()/recordActivity() on writes. All error messages in Persian. Mobile validated with /^09\d{9}$/, nationalId with /^\d{10}$. params typed as Promise<{ id: string }> and awaited.
- Replaced `skipDuplicates: true` on ServiceStaff.createMany (SQLite/Prisma typing reports the option as `never`) with manual Array.from(new Set(...)) de-duplication since the composite PK already prevents duplicates and deleteMany clears existing rows before re-creating.
- Ran `bun run lint` — clean (no errors, no warnings).
- Ran `bunx tsc --noEmit` — no errors in any of the new files under src/app/api/{leads,tasks,services,staff,payments,notifications,settings,audit,reports}/* (remaining tsc errors live in pre-existing files: scripts/seed.ts, examples/websocket, skills/*, src/lib/persian.ts — out of scope for this task).

Stage Summary:
- Created 16 API route files: leads (2), tasks (2), services (2), staff (2), payments (2), notifications (3: list, read-all, read-one), settings (1), audit (1), reports/financial (1).
- Lint results: `bun run lint` passes with zero errors / zero warnings.
- TypeScript: zero new errors in any of the new route files. The pre-existing tsc errors in scripts/seed.ts, examples/websocket/*, skills/*, and src/lib/persian.ts were present before this task and are out of scope.
- Issues encountered: Prisma's `createMany({ skipDuplicates: true })` option is typed as `never` for SQLite in this Prisma version, so I replaced it with explicit deduplication via `Array.from(new Set(...))` (the composite primary key on ServiceStaff already enforces uniqueness at the DB level). No other issues.
