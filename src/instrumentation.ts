// src/instrumentation.ts
// This file is automatically loaded by Next.js when the server starts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import telegram module and start the bot (only once via instrumentation)
    const { startBot } = await import('./lib/telegram');
    startBot().catch(err => {
      console.error('[INSTRUMENTATION] Failed to start Telegram bot:', err);
    });
    console.log('[INSTRUMENTATION] Telegram bot initialization triggered (background)');
  }
}
