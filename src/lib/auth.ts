import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const COOKIE = "nbv_session";
const SESSION_HOURS = 8;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: SessionUser, ip?: string) {
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  const session = await db.session.create({
    data: { userId: user.id, ip: ip ?? null, expiresAt },
  });
  const token = await new SignJWT({ sub: user.id, sid: session.id, role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(SECRET);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_HOURS * 3600,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const sid = payload.sid as string;
    const session = await db.session.findUnique({ where: { id: sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      await db.session.update({ where: { id: payload.sid as string }, data: { revokedAt: new Date() } }).catch(() => {});
    } catch {}
  }
  cookies().delete(COOKIE);
}

export async function logActivity(actor: SessionUser | null, entityType: string, action: string, detail?: string, entityId?: string) {
  await db.activityLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? "System",
      entityType,
      entityId: entityId ?? null,
      action,
      detail: detail ?? null,
    },
  });
}
