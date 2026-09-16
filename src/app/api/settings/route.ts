import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  unauthorized,
  forbidden,
  withErrorHandler,
} from "@/lib/api";
import { audit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

const DEFAULT_CLINIC = {
  name: "درمانگاه تخصصی",
  phone: "",
  address: "",
  workingHours: "شنبه تا چهارشنبه ۹ تا ۱۷",
  currency: "toman",
};

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();

  const setting = await db.setting.findUnique({ where: { key: "clinic" } });
  const clinic = setting ? JSON.parse(setting.value) : DEFAULT_CLINIC;

  const result: Record<string, unknown> = { clinic };

  // Optionally include users list for admin user management
  if (new URL(req.url).searchParams.get("include") === "users") {
    if (!hasPermission(s, "users.view")) return forbidden();
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { include: { role: { select: { id: true, name: true, label: true } } } },
      },
    });
    result.users = users;
  }

  return ok(result);
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "settings.manage")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const existing = await db.setting.findUnique({ where: { key: "clinic" } });
  const current = existing ? JSON.parse(existing.value) : DEFAULT_CLINIC;

  const next = {
    name: typeof body.name === "string" ? body.name.trim() : current.name,
    phone: typeof body.phone === "string" ? body.phone.trim() : current.phone,
    address: typeof body.address === "string" ? body.address.trim() : current.address,
    workingHours:
      typeof body.workingHours === "string" ? body.workingHours.trim() : current.workingHours,
    currency: typeof body.currency === "string" ? body.currency : current.currency,
  };

  const updated = await db.setting.upsert({
    where: { key: "clinic" },
    update: { value: JSON.stringify(next) },
    create: { key: "clinic", value: JSON.stringify(next) },
  });

  await audit({
    userId: s.id,
    action: "update",
    entity: "setting",
    entityId: updated.id,
    payload: { before: current, after: next },
    req,
  });

  return ok({ clinic: next });
});
