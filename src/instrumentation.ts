// src/instrumentation.ts
// This file is automatically loaded by Next.js when the server starts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import telegram module to trigger bot initialization
    await import('./lib/telegram');
    console.log('[INSTRUMENTATION] Telegram bot module loaded');
  }
}
