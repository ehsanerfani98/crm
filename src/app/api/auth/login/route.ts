import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { ok, fail, withErrorHandler } from "@/lib/api";
import { audit } from "@/lib/audit";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return fail("ایمیل و گذرواژه الزامی است.", 422);
  }

  const user = await db.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  if (!user || user.status !== "active") {
    return fail("کاربر یافت نشد یا حساب غیرفعال است.", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return fail("گذرواژه نادرست است.", 401);
  }

  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ userId: user.id, action: "login", entity: "user", entityId: user.id, req });

  const roles = user.roles.map((r) => r.role.name);
  const permissions = Array.from(
    new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.name))),
  );

  return ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles,
      permissions,
    },
  });
});
