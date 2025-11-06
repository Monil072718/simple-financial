import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/users";
import { z } from "zod";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;

  try {
    const user = await verifyPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET missing");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      { sub: user.id, email: user.email }, // minimal claims
      secret,
      { algorithm: "HS256", expiresIn }
    );

    // Return token + public user (no hash)
    return NextResponse.json(
      {
        token,
        user, // { id, name, email, created_at }
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[POST /api/auth/login] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
