// src/app/api/communications/telegram/webhook/[secret]/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/lib/telegram';

export async function POST(req: NextRequest, ctx: { params: { secret: string } }) {
  const secretInEnv = process.env.TG_WEBHOOK_SECRET!;
  const { secret } = ctx.params;

  if (!secretInEnv || secret !== secretInEnv) {
    return NextResponse.json({ ok: false, error: 'invalid secret' }, { status: 403 });
  }

  try {
    const update = await req.json();
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('telegram webhook error', e);
    // Always return 200 to avoid Telegram retry storms
    return NextResponse.json({ ok: true });
  }
}