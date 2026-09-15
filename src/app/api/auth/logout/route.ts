import { NextRequest } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { ok, withErrorHandler } from "@/lib/api";
import { audit } from "@/lib/audit";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const s = await getSession();
  if (s) {
    await audit({ userId: s.id, action: "logout", entity: "user", entityId: s.id, req });
  }
  await destroySession();
  return ok({ success: true });
});
