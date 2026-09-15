import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, validationError, withErrorHandler } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.update")) return forbidden();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.content?.trim()) return validationError({ content: "متن یادداشت الزامی است." });

  const note = await db.note.create({
    data: {
      patientId: id,
      content: body.content.trim(),
      authorId: s.id,
    },
    include: { author: { select: { name: true } } },
  });
  return ok({ note });
});

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasPermission(s, "patients.view")) return forbidden();

  const { id } = await params;
  const notes = await db.note.findMany({
    where: { patientId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });
  return ok({ notes });
});
