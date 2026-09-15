import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ok,
  fail,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  withErrorHandler,
} from "@/lib/api";
import { audit, recordActivity } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "leads.update")) return forbidden();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Special action: convert lead into a patient.
    if (body.convertToPatient === true) {
      return convertToPatient(req, s, id);
    }

    const errors: Record<string, string> = {};
    if (body.firstName !== undefined && !body.firstName?.trim())
      errors.firstName = "نام الزامی است.";
    if (body.lastName !== undefined && !body.lastName?.trim())
      errors.lastName = "نام خانوادگی الزامی است.";
    if (body.mobile && !/^09\d{9}$/.test(String(body.mobile).trim())) {
      errors.mobile = "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد.";
    }
    if (Object.keys(errors).length) return validationError(errors);

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) return notFound("لید یافت نشد.");

    if (body.mobile && body.mobile !== existing.mobile) {
      const dup = await db.patient.findUnique({
        where: { mobile: String(body.mobile).trim() },
      });
      if (dup) return fail("شماره موبایل قبلاً برای مراجعی ثبت شده است.", 409);
    }

    const updated = await db.lead.update({
      where: { id },
      data: {
        firstName: body.firstName?.trim(),
        lastName: body.lastName?.trim(),
        mobile: body.mobile !== undefined ? body.mobile?.trim() || null : undefined,
        source: body.source !== undefined ? body.source || null : undefined,
        interest: body.interest !== undefined ? body.interest?.trim() || null : undefined,
        status: body.status,
        notes: body.notes !== undefined ? body.notes?.trim() || null : undefined,
        assignedToId: body.assignedToId !== undefined ? body.assignedToId || null : undefined,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await audit({
      userId: s.id,
      action: "update",
      entity: "lead",
      entityId: id,
      payload: { before: existing, after: updated },
      req,
    });

    return ok({ lead: updated });
  },
);

export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const s = await getSession();
    if (!s) return unauthorized();
    if (!hasPermission(s, "leads.delete")) return forbidden();

    const { id } = await params;
    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) return notFound("لید یافت نشد.");

    await db.lead.delete({ where: { id } });
    await audit({
      userId: s.id,
      action: "delete",
      entity: "lead",
      entityId: id,
      payload: { name: `${existing.firstName} ${existing.lastName}` },
      req,
    });

    return ok({ success: true });
  },
);

/**
 * Convert a lead into a Patient:
 *  - copy firstName, lastName, mobile, source
 *  - generate next patient code (P-XXXX)
 *  - link lead.patientId, set lead.status = "customer"
 *  - audit + activity
 */
async function convertToPatient(
  req: NextRequest,
  s: { id: string },
  leadId: string,
) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return notFound("لید یافت نشد.");

  if (lead.patientId) {
    const linked = await db.patient.findUnique({ where: { id: lead.patientId } });
    if (linked) {
      return fail("این لید قبلاً به مراجع تبدیل شده است.", 409);
    }
  }

  // Mobile uniqueness check
  if (lead.mobile) {
    const exists = await db.patient.findUnique({ where: { mobile: lead.mobile } });
    if (exists) {
      // Link the lead to the existing patient instead of creating a duplicate.
      await db.lead.update({
        where: { id: leadId },
        data: { patientId: exists.id, status: "customer" },
      });
      await audit({
        userId: s.id,
        action: "convert",
        entity: "lead",
        entityId: leadId,
        payload: { linkedToPatientId: exists.id, code: exists.code },
        req,
      });
      await recordActivity({
        patientId: exists.id,
        userId: s.id,
        type: "status",
        title: `لید «${lead.firstName} ${lead.lastName}» به این پرونده متصل شد.`,
      });
      return ok({ patient: exists, lead: await db.lead.findUnique({ where: { id: leadId } }), linked: true });
    }
  }

  // Generate next patient code
  const lastPatient = await db.patient.findFirst({ orderBy: { code: "desc" } });
  let nextNum = 1001;
  if (lastPatient?.code) {
    const m = lastPatient.code.match(/P-(\d+)/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  const code = `P-${nextNum}`;

  const patient = await db.patient.create({
    data: {
      code,
      firstName: lead.firstName,
      lastName: lead.lastName,
      mobile: lead.mobile || null,
      source: lead.source || "walk_in",
      status: "active",
      createdById: s.id,
    },
  });

  await db.lead.update({
    where: { id: leadId },
    data: { patientId: patient.id, status: "customer" },
  });

  await audit({
    userId: s.id,
    action: "convert",
    entity: "lead",
    entityId: leadId,
    payload: { patientId: patient.id, code: patient.code },
    req,
  });
  await audit({
    userId: s.id,
    action: "create",
    entity: "patient",
    entityId: patient.id,
    payload: { code: patient.code, fromLead: leadId },
    req,
  });
  await recordActivity({
    patientId: patient.id,
    userId: s.id,
    type: "status",
    title: `پرونده مراجع ${patient.firstName} ${patient.lastName} از لید ایجاد شد.`,
    meta: { leadId, source: lead.source },
  });

  const updatedLead = await db.lead.findUnique({ where: { id: leadId } });
  return ok({ patient, lead: updatedLead });
}
