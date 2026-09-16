import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
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
  if (!hasPermission(s, "tasks.view")) return forbidden();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assignedToId = url.searchParams.get("assignedToId");
  const patientId = url.searchParams.get("patientId");
  const { skip, take, page, pageSize } = pagination(url.searchParams);

  const where = {
    AND: [
      status && status !== "all" ? { status } : {},
      priority && priority !== "all" ? { priority } : {},
      assignedToId && assignedToId !== "all" ? { assignedToId } : {},
      patientId ? { patientId } : {},
      q
        ? {
            OR: [{ title: { contains: q } }, { description: { contains: q } }],
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    db.task.findMany({
      where,
      skip,
      take,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, code: true },
        },
        assignedTo: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    }),
    db.task.count({ where }),
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
  if (!hasPermission(s, "tasks.create")) return forbidden();

  const body = await req.json().catch(() => ({}));
  const errors: Record<string, string> = {};
  if (!body.title?.trim()) errors.title = "عنوان وظیفه الزامی است.";
  if (Object.keys(errors).length) return validationError(errors);

  const task = await db.task.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status || "pending",
      priority: body.priority || "medium",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      patientId: body.patientId || null,
      assignedToId: body.assignedToId || null,
      createdById: s.id,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, code: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  await audit({
    userId: s.id,
    action: "create",
    entity: "task",
    entityId: task.id,
    payload: { title: task.title, priority: task.priority },
    req,
  });

  return ok({ task });
});
