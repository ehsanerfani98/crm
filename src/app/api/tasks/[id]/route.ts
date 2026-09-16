import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  withErrorHandler,
} from "@/lib/api";
import { audit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "tasks.update")) return forbidden();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.title !== undefined && !body.title?.trim()) {
      return validationError({ title: "عنوان وظیفه الزامی است." });
    }

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return notFound("وظیفه یافت نشد.");

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined)
      data.description = body.description?.trim() || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.dueDate !== undefined)
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.patientId !== undefined)
      data.patientId = body.patientId || null;
    if (body.assignedToId !== undefined)
      data.assignedToId = body.assignedToId || null;

    const updated = await db.task.update({
      where: { id },
      data,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, code: true },
        },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await audit({
      userId: s.id,
      action: "update",
      entity: "task",
      entityId: id,
      payload: { before: existing, after: updated },
      req,
    });

    return ok({ task: updated });
  },
);

export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "tasks.delete")) return forbidden();

    const { id } = await params;
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return notFound("وظیفه یافت نشد.");

    await db.task.delete({ where: { id } });
    await audit({
      userId: s.id,
      action: "delete",
      entity: "task",
      entityId: id,
      payload: { title: existing.title },
      req,
    });

    return ok({ success: true });
  },
);
