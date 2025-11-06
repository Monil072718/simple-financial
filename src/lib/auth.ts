// src/lib/auth.ts
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextRequest } from "next/server";

export type AuthUser = { id: number; email: string };

function isAuthPayload(p: unknown): p is { sub: string | number; email: string } {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  const hasSub = typeof obj.sub === "string" || typeof obj.sub === "number";
  const hasEmail = typeof obj.email === "string";
  return hasSub && hasEmail;
}

export function verifyAuth(headerAuth?: string): AuthUser | null {
  if (!headerAuth) return null;
  const [scheme, token] = headerAuth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");

  try {
    // jwt.verify -> string | JwtPayload
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });

    if (typeof decoded === "string") return null; // not an object payload

    // Narrow the arbitrary JwtPayload to what we actually need
    if (!isAuthPayload(decoded as unknown)) return null;

    const { sub, email } = decoded as JwtPayload & { sub: string | number; email: string };
    return { id: Number(sub), email };
  } catch {
    return null;
  }
}

export function getAuthUser(req: NextRequest): AuthUser | null {
  const headerAuth = req.headers.get("authorization") || undefined;
  return verifyAuth(headerAuth);
}
