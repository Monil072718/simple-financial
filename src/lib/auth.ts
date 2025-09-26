import jwt from "jsonwebtoken";

export type AuthUser = { id: number; email: string };

export function verifyAuth(headerAuth?: string): AuthUser | null {
  if (!headerAuth) return null;
  const [scheme, token] = headerAuth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");

  try {
    const decoded = jwt.verify(token, secret) as { sub: number; email: string };
    return { id: Number(decoded.sub), email: decoded.email };
  } catch {
    return null;
  }
}
