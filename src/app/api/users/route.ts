// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/users";
import { z } from "zod";

export const runtime = "nodejs";

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 chars"),
});

// Type guard for Postgres-like errors (e.g., unique_violation 23505)
function hasPgCode(err: unknown): err is { code: string } {
  return typeof err === "object" && err !== null && "code" in err && typeof (err as { code: unknown }).code === "string";
}

export async function GET() {
  const users = await listUsers();
  return NextResponse.json(users, { status: 200 });
}

export async function POST(req: NextRequest) {
  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = CreateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  try {
    // create in DB (hashes password internally)
    await createUser(name, email, password);

    // return the same shape you sent (without password)
    return NextResponse.json({ name, email }, { status: 201 });
  } catch (err: unknown) {
    if (hasPgCode(err) && err.code === "23505") {
      // unique_violation
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error("[POST /api/users] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
