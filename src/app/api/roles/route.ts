import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  unauthorized,
  forbidden,
  validationError,
  withErrorHandler,
} from "@/lib/api";
import { audit } from "@/lib/audit";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * GET /api/roles
 * Returns every role with its bound permission names, plus the full permission
 * catalog so the UI can render the complete matrix.
 */
export const GET = withErrorHandler(async () => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "users.view")) return forbidden();

  const roles = await db.role.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      label: true,
      description: true,
      permissions: { select: { permission: { select: { name: true } } } },
    },
  });

  return ok({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label,
      description: r.description,
      permissions: r.permissions.map((p) => p.permission.name),
    })),
    catalog: PERMISSIONS.map((p) => ({ name: p.name, label: p.label, group: p.group })),
  });
});

/**
 * PUT /api/roles
 * Body: { roleId: string, permissions: string[] }
 * Replaces the permission set of a single role.
 */
export const PUT = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "users.manage")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const roleId = typeof body.roleId === "string" ? body.roleId : "";
  const rawPerms = Array.isArray(body.permissions) ? body.permissions : null;

  if (!roleId) return validationError({ roleId: "شناسه نقش الزامی است." });
  if (!rawPerms) return validationError({ permissions: "فهرست دسترسی‌ها نامعتبر است." });

  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) return validationError({ roleId: "نقش مورد نظر یافت نشد." });

  // Only accept permission names that exist in the catalog.
  const validNames = new Set<string>(PERMISSIONS.map((p) => p.name));
  const nextNames: string[] = Array.from(
    new Set<string>(
      rawPerms.filter((n): n is string => typeof n === "string" && validNames.has(n)),
    ),
  );

  // The admin role must always retain every permission to avoid lockout.
  if (role.name === "admin") {
    return validationError({
      permissions: "دسترسی‌های نقش «مدیر کل» قابل تغییر نیست.",
    });
  }

  const before = role.permissions.map((p) => p.permission.name).sort();

  const perms = await db.permission.findMany({
    where: { name: { in: nextNames } },
    select: { id: true, name: true },
  });

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId } }),
    db.rolePermission.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.id })),
    }),
  ]);

  await audit({
    userId: s.id,
    action: "update",
    entity: "role",
    entityId: roleId,
    payload: { role: role.name, before, after: nextNames.sort() },
    req,
  });

  return ok({ roleId, permissions: nextNames.sort() });
});
