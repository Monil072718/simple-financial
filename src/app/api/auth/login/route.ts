import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/users";
import { z } from "zod";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";

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

    const envSecret = process.env.JWT_SECRET;
    if (!envSecret) {
      console.error("JWT_SECRET missing");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const secret: Secret = envSecret;

    // jsonwebtoken wants number (seconds) or an "ms" StringValue (e.g., "7d", "12h")
    const raw = process.env.JWT_EXPIRES_IN;
    const expiresIn: number | StringValue =
      raw == null || raw === ""
        ? ("7d" as StringValue)
        : Number.isFinite(Number(raw))
        ? Number(raw)
        : (raw as StringValue);

    const signOptions: SignOptions = {
      algorithm: "HS256",
      expiresIn,
    };

    const token = jwt.sign(
      { sub: String(user.id), email: user.email },
      secret,
      signOptions
    );

    return NextResponse.json(
      {
        token,
        user,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[POST /api/auth/login] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
