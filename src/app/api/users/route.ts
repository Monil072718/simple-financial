import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/users";
import { z } from "zod";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export async function GET() {
  const users = await listUsers();
  return NextResponse.json(users, { status: 200 });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const user = await createUser(parsed.data.name, parsed.data.email);
    return NextResponse.json(user, { status: 201 });
  } catch (e:any) {
    if (e?.code === "23505") return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
