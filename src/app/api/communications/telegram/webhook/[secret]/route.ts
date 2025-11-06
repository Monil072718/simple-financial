// src/app/api/communications/telegram/webhook/[secret]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram";
import type { Update } from "telegraf/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { secret: string } }
) {
  const secretInEnv = process.env.TG_WEBHOOK_SECRET;
  const { secret } = params;

  if (!secretInEnv || secret !== secretInEnv) {
    return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 403 });
  }

  try {
    const update = (await req.json()) as Update;
    await handleTelegramUpdate(update);
    // Return 200 so Telegram doesn't retry on success
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("telegram webhook error", e);
    // IMPORTANT: still return 200 to avoid Telegram retry storms
    return NextResponse.json({ ok: true });
  }
}
