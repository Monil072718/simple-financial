// src/lib/auth.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export type AuthUser = { id: number; email: string };

export function verifyAuth(headerAuth?: string): AuthUser | null {
  if (!headerAuth) return null;
  const [scheme, token] = headerAuth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");

  try {
    // verify can return string | JwtPayload
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });

    // If it's a string, it's not our object payload
    if (typeof decoded === "string") return null;

    // decoded is JwtPayload; pull fields safely
    const sub = decoded.sub;               // string | number | undefined
    const email = (decoded as { email?: string }).email;  // JwtPayload is indexable

    if (sub == null || !email) return null;

    return { id: Number(sub), email: String(email) };
  } catch {
    return null;
  }
}

export function getAuthUser(req: NextRequest): AuthUser | null {
  const headerAuth = req.headers.get("authorization") || undefined;
  return verifyAuth(headerAuth);
}
