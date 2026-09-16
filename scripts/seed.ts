/**
 * Seed script: creates permissions, roles, demo users, services, staff,
 * sample patients, appointments, leads, tasks, payments and audit log entries.
 *
 * Run with: `bun run db:seed`
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/permissions";

const db = new PrismaClient();

async function main() {
  console.log("-> seeding permissions...");
  for (const p of PERMISSIONS) {
    await db.permission.upsert({
      where: { name: p.name },
      update: { label: p.label, group: p.group },
      create: { name: p.name, label: p.label, group: p.group },
    });
  }

  console.log("-> seeding roles...");
  const roleMap: Record<string, string> = {
    admin: "مدیر کل",
    doctor: "پزشک",
    secretary: "منشی",
    operator: "اپراتور",
    accountant: "حسابدار",
  };
  for (const [name, label] of Object.entries(roleMap)) {
    await db.role.upsert({
      where: { name },
      update: { label },
      create: { name, label, description: `نقش ${label}` },
    });
  }

  console.log("-> binding role permissions...");
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    for (const permName of permNames) {
      const perm = await db.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log("-> seeding users...");
  const passwordHash = await bcrypt.hash("password", 10);
  const admin = await db.user.upsert({
    where: { email: "admin@clinic.local" },
    update: {},
    create: {
      name: "مدیر سیستم",
      email: "admin@clinic.local",
      passwordHash,
      phone: "09120000000",
      status: "active",
    },
  });
  const doctor = await db.user.upsert({
    where: { email: "doctor@clinic.local" },
    update: {},
    create: {
      name: "دکتر سارا محمدی",
      email: "doctor@clinic.local",
      passwordHash,
      phone: "09121111111",
      status: "active",
    },
  });
  const secretary = await db.user.upsert({
    where: { email: "secretary@clinic.local" },
    update: {},
    create: {
      name: "نگار رضایی",
      email: "secretary@clinic.local",
      passwordHash,
      phone: "09122222222",
      status: "active",
    },
  });
  const operator = await db.user.upsert({
    where: { email: "operator@clinic.local" },
    update: {},
    create: {
      name: "آرش کریمی",
      email: "operator@clinic.local",
      passwordHash,
      phone: "09123333333",
      status: "active",
    },
  });
  const accountant = await db.user.upsert({
    where: { email: "accountant@clinic.local" },
    update: {},
    create: {
      name: "مریم احمدی",
      email: "accountant@clinic.local",
      passwordHash,
      phone: "09124444444",
      status: "active",
    },
  });

  // Attach roles
  for (const [u, r] of [
    [admin, "admin"],
    [doctor, "doctor"],
    [secretary, "secretary"],
    [operator, "operator"],
    [accountant, "accountant"],
  ] as const) {
    const role = await db.role.findUnique({ where: { name: r } });
    if (role) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: u.id, roleId: role.id } },
        update: {},
        create: { userId: u.id, roleId: role.id },
      });
    }
  }

  console.log("-> seeding staff...");
  const staffDoctor = await db.staff.upsert({
    where: { userId: doctor.id },
    update: {},
    create: {
      userId: doctor.id,
      firstName: "سارا",
      lastName: "محمدی",
      fullName: "دکتر سارا محمدی",
      type: "doctor",
      specialty: "متخصص پوست و مو",
      phone: "09121111111",
      email: "doctor@clinic.local",
      status: "active",
      workDays: "sat,sun,mon,tue,wed",
      workStart: "09:00",
      workEnd: "17:00",
      color: "#0d9488",
    },
  });
  await db.staff.upsert({
    where: { userId: secretary.id },
    update: {},
    create: {
      userId: secretary.id,
      firstName: "نگار",
      lastName: "رضایی",
      fullName: "نگار رضایی",
      type: "secretary",
      phone: "09122222222",
      status: "active",
      workDays: "sat,sun,mon,tue,wed,thu",
      workStart: "08:00",
      workEnd: "16:00",
      color: "#6366f1",
    },
  });

  console.log("-> seeding services...");
  const services = [
    { name: "ویزیت تخصصی", description: "ویزیت توسط متخصص پوست و مو", price: 250000, durationMin: 20, category: "visit" },
    { name: "مشاوره زیبایی", description: "مشاوره تخصصی درمان‌های زیبایی", price: 150000, durationMin: 30, category: "consult" },
    { name: "لیزر موهای زائد", description: "لیزر دیود برای یک ناحیه", price: 600000, durationMin: 45, category: "laser" },
    { name: "تزریق بوتاکس", description: "تزریق بوتاکس یک ناحیه", price: 2500000, durationMin: 30, category: "injection" },
    { name: "تزریق ژل", description: "تزریق فیلر یک ناحیه", price: 3500000, durationMin: 45, category: "injection" },
    { name: "پاکسازی پوست", description: "پاکسازی عمقی پوست صورت", price: 450000, durationMin: 60, category: "beauty" },
    { name: "میکرودرم", description: "میکرودرم ابری صورت", price: 350000, durationMin: 30, category: "beauty" },
    { name: "آزمایش خون", description: "آزمایش عمومی خون", price: 180000, durationMin: 15, category: "lab" },
  ];
  const serviceRecords = [];
  for (const s of services) {
    const rec = await db.service.create({
      data: { ...s, status: "active" },
    });
    serviceRecords.push(rec);
    await db.serviceStaff.create({
      data: { serviceId: rec.id, staffId: staffDoctor.id },
    }).catch(() => undefined);
  }

  console.log("-> seeding patients...");
  const patientNames = [
    ["زهرا", "حسینی", "09130000001", "f"],
    ["محمد", "کریمی", "09130000002", "m"],
    ["فاطمه", "نوری", "09130000003", "f"],
    ["علی", "موسوی", "09130000004", "m"],
    ["نرگس", "ابراهیمی", "09130000005", "f"],
    ["حسین", "صادقی", "09130000006", "m"],
    ["مریم", "قاسمی", "09130000007", "f"],
    ["رضا", "شفیعی", "09130000008", "m"],
    ["سحر", "میرزایی", "09130000009", "f"],
    ["امیر", "رضا", "09130000010", "m"],
    ["الهام", "اسدی", "09130000011", "f"],
    ["بهنام", "یوسفی", "09130000012", "m"],
    ["پریسا", "صالحی", "09130000013", "f"],
    ["سینا", "نظری", "09130000014", "m"],
    ["اندیشه", "فلاح", "09130000015", "f"],
  ];
  const patients = [];
  for (let i = 0; i < patientNames.length; i++) {
    const [fn, ln, mob, gender] = patientNames[i];
    const p = await db.patient.create({
      data: {
        code: `P-${1000 + i + 1}`,
        firstName: fn,
        lastName: ln,
        mobile: mob,
        gender,
        nationalId: `00${1000000000 + i}`,
        birthDate: new Date(1985 + i, i % 12, (i + 5) % 28 + 1),
        address: `تهران، خیابان ${i + 1}`,
        status: i % 11 === 0 ? "inactive" : "active",
        source: i % 3 === 0 ? "referral" : i % 3 === 1 ? "instagram" : "walk_in",
        firstVisitAt: new Date(Date.now() - (i + 5) * 86400000),
        lastVisitAt: new Date(Date.now() - i * 86400000),
        createdById: secretary.id,
      },
    });
    patients.push(p);
  }

  console.log("-> seeding appointments...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const dayOffset = i < 10 ? 0 : i < 20 ? 1 : -1;
    const hour = 9 + Math.floor(Math.random() * 8);
    const minute = Math.random() > 0.5 ? 0 : 30;
    const start = new Date(today);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    const p = patients[i % patients.length];
    const s = serviceRecords[i % serviceRecords.length];
    const status = dayOffset === 0
      ? ["booked", "confirmed", "waiting", "in_progress"][i % 4]
      : dayOffset > 0
        ? ["booked", "confirmed"][i % 2]
        : ["done", "cancelled", "no_show"][i % 3];
    await db.appointment.create({
      data: {
        patientId: p.id,
        doctorId: staffDoctor.id,
        serviceId: s.id,
        startAt: start,
        endAt: end,
        durationMin: 30,
        status,
        price: s.price,
        createdById: secretary.id,
      },
    });
  }

  console.log("-> seeding leads...");
  const leadSources = ["instagram", "referral", "call", "website", "walk_in"];
  const leadStatuses = ["new", "contacted", "interested", "booked", "visited", "customer", "lost"];
  for (let i = 0; i < 12; i++) {
    await db.lead.create({
      data: {
        firstName: `لید${i + 1}`,
        lastName: `جدید${i + 1}`,
        mobile: `0914000${String(i).padStart(4, "0")}`,
        source: leadSources[i % leadSources.length],
        interest: serviceRecords[i % serviceRecords.length].name,
        status: leadStatuses[i % leadStatuses.length],
        notes: "تماس اولیه برای مشاوره",
        assignedToId: operator.id,
      },
    });
  }

  console.log("-> seeding tasks...");
  for (let i = 0; i < 8; i++) {
    const due = new Date(today);
    due.setDate(due.getDate() + (i - 2));
    due.setHours(10 + i, 0, 0, 0);
    await db.task.create({
      data: {
        title: `وظیفه نمونه ${i + 1}`,
        description: "این یک وظیفه نمونه برای تست سیستم است.",
        status: i < 3 ? "done" : i < 6 ? "pending" : "in_progress",
        priority: ["low", "medium", "high", "urgent"][i % 4],
        dueDate: due,
        assignedToId: secretary.id,
        createdById: admin.id,
        patientId: i < patients.length ? patients[i].id : undefined,
      },
    });
  }

  console.log("-> seeding payments...");
  for (let i = 0; i < 20; i++) {
    const p = patients[i % patients.length];
    const s = serviceRecords[i % serviceRecords.length];
    const created = new Date(today);
    created.setDate(created.getDate() - Math.floor(i / 2));
    const discount = i % 5 === 0 ? s.price * 0.1 : 0;
    await db.payment.create({
      data: {
        patientId: p.id,
        amount: s.price,
        discount,
        finalAmount: s.price - discount,
        method: ["cash", "card", "transfer", "online"][i % 4],
        status: "paid",
        reference: `TRX-${Date.now()}-${i}`,
        receivedById: accountant.id,
        createdAt: created,
        updatedAt: created,
      },
    });
  }

  console.log("-> seeding notes + activities...");
  for (let i = 0; i < 6; i++) {
    const p = patients[i];
    await db.note.create({
      data: {
        patientId: p.id,
        content: `یادداشت داخلی درباره ${p.firstName} - حساسیت دارویی ثبت شد.`,
        authorId: secretary.id,
      },
    });
    await db.activity.create({
      data: {
        patientId: p.id,
        userId: secretary.id,
        type: "call",
        title: `تماس تلفنی با ${p.firstName} برای یادآوری نوبت`,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    });
  }

  console.log("-> seeding notifications...");
  for (const u of [admin, doctor, secretary]) {
    await db.notification.create({
      data: {
        userId: u.id,
        type: "appointment",
        title: "نوبت جدید ثبت شد",
        body: "یک نوبت جدید برای امروز ساعت ۱۰:۰۰ ایجاد شده است.",
        link: "/?p=appointments",
      },
    });
  }

  console.log("-> seeding settings...");
  await db.setting.upsert({
    where: { key: "clinic" },
    update: {},
    create: {
      key: "clinic",
      value: JSON.stringify({
        name: "درمانگاه تخصصی پوست و مو",
        phone: "021-12345678",
        address: "تهران، خیابان ولیعصر، پلاک ۱۲۳",
        workingHours: "شنبه تا چهارشنبه ۹ تا ۱۷",
        currency: "toman",
      }),
    },
  });

  console.log("OK seed complete");
  console.log("   admin:      admin@clinic.local / password");
  console.log("   doctor:     doctor@clinic.local / password");
  console.log("   secretary:  secretary@clinic.local / password");
  console.log("   operator:   operator@clinic.local / password");
  console.log("   accountant: accountant@clinic.local / password");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
