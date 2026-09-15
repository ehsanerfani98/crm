import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  fail,
  unauthorized,
  forbidden,
  validationError,
  pagination,
  withErrorHandler,
} from "@/lib/api";
import { audit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "leads.view")) return forbidden();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const assignedToId = url.searchParams.get("assignedToId");
  const { skip, take, page, pageSize } = pagination(url.searchParams);

  const where = {
    AND: [
      status && status !== "all" ? { status } : {},
      source && source !== "all" ? { source } : {},
      assignedToId && assignedToId !== "all" ? { assignedToId } : {},
      q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { mobile: { contains: q } },
              { interest: { contains: q } },
              { notes: { contains: q } },
            ],
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    db.lead.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true } },
        patient: { select: { id: true, code: true, firstName: true, lastName: true } },
      },
    }),
    db.lead.count({ where }),
  ]);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "leads.create")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (!body.firstName?.trim()) errors.firstName = "نام الزامی است.";
  if (!body.lastName?.trim()) errors.lastName = "نام خانوادگی الزامی است.";
  if (body.mobile && !/^09\d{9}$/.test(String(body.mobile).trim())) {
    errors.mobile = "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد.";
  }
  if (Object.keys(errors).length) return validationError(errors);

  const lead = await db.lead.create({
    data: {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      mobile: body.mobile?.trim() || null,
      source: body.source || null,
      interest: body.interest?.trim() || null,
      status: body.status || "new",
      notes: body.notes?.trim() || null,
      assignedToId: body.assignedToId || null,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  await audit({
    userId: s.id,
    action: "create",
    entity: "lead",
    entityId: lead.id,
    payload: { firstName: lead.firstName, lastName: lead.lastName, status: lead.status },
    req,
  });

  return ok({ lead });
});
