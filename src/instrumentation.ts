// src/instrumentation.ts
// This file is automatically loaded by Next.js when the server starts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import telegram module and start the bot (only once via instrumentation)
    const { startBot } = await import('./lib/telegram');
    await startBot();
    console.log('[INSTRUMENTATION] Telegram bot initialized');
  }
}
