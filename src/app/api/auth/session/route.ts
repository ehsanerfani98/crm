import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const s = await getSession();
  if (!s) return ok({ user: null });
  // sync latest permissions from DB (in case admin changed roles)
  const fresh = await db.user.findUnique({
    where: { id: s.id },
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
  if (!fresh || fresh.status !== "active") return ok({ user: null });
  const roles = fresh.roles.map((r) => r.role.name);
  const permissions = Array.from(
    new Set(fresh.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.name))),
  );
  return ok({
    user: {
      id: fresh.id,
      name: fresh.name,
      email: fresh.email,
      phone: fresh.phone,
      roles,
      permissions,
    },
  });
}
