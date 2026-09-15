/**
 * Lightweight session-based authentication.
 * Uses signed httpOnly cookies + bcrypt password hashing.
 * Compatible with Next.js 16 App Router (uses `cookies()` from `next/headers`).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { User, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
};

const SESSION_COOKIE = "crm_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  // Simple HMAC-like signature using env secret.
  // For demo purposes only — replace with real JWT in production.
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  // XOR-based quick signature (NOT cryptographically secure).
  let h = 0;
  for (let i = 0; i < secret.length; i++) h = (h * 31 + secret.charCodeAt(i)) | 0;
  let sig = 0;
  for (let i = 0; i < payload.length; i++) sig = (sig + payload.charCodeAt(i) * (i + 1)) | 0;
  return `${payload}.${(sig ^ h).toString(36)}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const expected = sign(payload);
  return token === expected ? payload : null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string): Promise<void> {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = JSON.stringify({ uid: userId, exp: expires });
  const token = sign(Buffer.from(payload).toString("base64url"));
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payloadB64 = verify(token);
    if (!payloadB64) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (!payload.uid || !payload.exp || payload.exp < Date.now()) return null;
    const user = await db.user.findUnique({
      where: { id: payload.uid },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user || user.status !== "active") return null;
    const roles = user.roles.map((r) => r.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((p) => p.permission.name),
        ),
      ),
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
      permissions,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect("/");
  return s;
}

export async function requirePermission(perm: string): Promise<SessionUser> {
  const s = await requireUser();
  if (s.roles.includes("admin")) return s;
  if (!s.permissions.includes(perm)) {
    throw new Error(`دسترسی غیرمجاز: ${perm}`);
  }
  return s;
}

export async function getCurrentUserWithProfile(): Promise<
  | (User & { roles: { role: Role }[] })
  | null
> {
  const s = await getSession();
  if (!s) return null;
  return db.user.findUnique({
    where: { id: s.id },
    include: { roles: { include: { role: true } } },
  });
}
