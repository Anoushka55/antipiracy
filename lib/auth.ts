import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";
import type { SessionUser } from "./types";
import { getStore } from "./store";
import { verifyPassword } from "./hash";

function secret() {
  const raw = process.env.SESSION_SECRET ?? "schand-command-center-prototype-dev-secret-change-me";
  return new TextEncoder().encode(raw);
}

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    title: user.title,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readSession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      tenantId: payload.tenantId as SessionUser["tenantId"],
      name: String(payload.name),
      title: String(payload.title),
      email: String(payload.email),
      role: payload.role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
}

export function authenticate(email: string, password: string): SessionUser | null {
  const state = getStore();
  const user = state.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.active && u.tenantId === "SCHAND"
  );
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    title: user.title,
    email: user.email,
    role: user.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
