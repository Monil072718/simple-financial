// src/app/api/debug/env/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const tokenLength = process.env.TELEGRAM_BOT_TOKEN?.length || 0;
  const appUrl = process.env.APP_URL || process.env.PUBLIC_URL;
  const webhookSecret = process.env.TG_WEBHOOK_SECRET;
  
  return NextResponse.json({
    telegram: {
      hasToken,
      tokenLength,
      tokenPrefix: process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) + '...',
    },
    webhook: {
      appUrl,
      hasWebhookSecret: !!webhookSecret,
    },
    nodeEnv: process.env.NODE_ENV,
  });
}
