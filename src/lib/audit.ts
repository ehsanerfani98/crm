/**
 * Audit log + Activity helpers.
 * Use these to record sensitive actions across the system.
 */
import { db } from "@/lib/db";

type AuditInput = {
  userId?: string;
  action: string; // create | update | delete | login | view | ...
  entity: string; // patient | appointment | payment | ...
  entityId?: string;
  payload?: Record<string, unknown>;
  req?: Request;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        ip: input.req?.headers?.get?.("x-forwarded-for") ?? null,
        userAgent: input.req?.headers?.get?.("user-agent") ?? null,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      },
    });
  } catch (err) {
    // Never let audit failure break the main operation.
    console.error("[audit] failed:", err);
  }
}

type ActivityInput = {
  patientId?: string;
  userId: string;
  type: string; // appointment | payment | note | call | message | status | other
  title: string;
  meta?: Record<string, unknown>;
};

export async function recordActivity(input: ActivityInput): Promise<void> {
  try {
    await db.activity.create({
      data: {
        patientId: input.patientId ?? null,
        userId: input.userId,
        type: input.type,
        title: input.title,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (err) {
    console.error("[activity] failed:", err);
  }
}

/** Push a notification to a user (in-app). */
export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}
