// src/lib/telegram.ts
import { Telegraf, Markup } from "telegraf";

const token = process.env.TELEGRAM_BOT_TOKEN!;
if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

type TelegramGlobal = typeof globalThis & {
  __bot?: Telegraf;
  __botReady?: boolean;
  __botStarted?: boolean;
};

const g = globalThis as TelegramGlobal;

/* ----------------------------- Boot the bot once ---------------------------- */
if (!g.__bot) {
  g.__bot = new Telegraf(token);
  g.__botReady = false;
  g.__botStarted = false;

  // /start => ask for phone (contact)
  g.__bot.start(async (ctx) => {
    const kb = Markup.keyboard([Markup.button.contactRequest("📱 Share my phone")])
      .oneTime()
      .resize();
    await ctx.reply("Hi! Please share your phone to link your account.", kb);
  });

  // Contact => link profile by phone (match on last 10 digits)
  g.__bot.on("contact", async (ctx) => {
    try {
      const phone = ctx.message?.contact?.phone_number;
      const chatId = ctx.chat?.id;
      const username = ctx.from?.username || null;

      if (!phone || !chatId) return ctx.reply("Could not read phone/chat.");

      const digits = phone.replace(/[^0-9]/g, "");
      const last10 = digits.slice(-10);

      console.log("[TELEGRAM] incoming contact", {
        raw: phone,
        digits,
        last10,
        chatId,
        username,
      });

      const profile = await findProfileByPhone(phone);
      if (!profile) {
        console.warn("[TELEGRAM] No profile found for", { last10 });
        return ctx.reply("Your number is not registered in our system.");
      }

      await linkTelegramToProfile(profile.id, {
        telegram_chat_id: chatId,
        telegram_username: username,
        telegram_opt_in: true,
      });

      await ctx.reply("Linked! You will now receive task updates here.", Markup.removeKeyboard());
    } catch (e) {
      console.error("contact error", e);
      await ctx.reply("Something went wrong linking your account.");
    }
  });

  // Fallback
  g.__bot.on("text", async (ctx) => {
    await ctx.reply("Type /start to (re)link your phone, or wait for task notifications.");
  });

  g.__botReady = true;
}

export const bot = g.__bot!;

/* ------------------------------ Start / Webhook ----------------------------- */
let starting = false;

export async function startBot() {
  if (g.__botStarted || starting) return;
  starting = true;

  try {
    const isProd = process.env.NODE_ENV === "production";

    // Build webhook URL (prod only)
    const baseUrl = process.env.APP_URL || process.env.PUBLIC_URL;
    const webhookUrl = `${baseUrl}/api/communications/telegram/webhook/${process.env.TG_WEBHOOK_SECRET}`;

    if (isProd) {
      await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => {});
      await bot.telegram.setWebhook(webhookUrl);
      console.log("Telegram webhook configured:", webhookUrl);
    } else {
      // Dev → polling
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log("Webhook cleared; starting polling…");
      await bot.launch({ dropPendingUpdates: true });
      console.log("Telegram bot started with polling");
    }

    if (!g.__botStarted) {
      const stop = async () => {
        try {
          await bot.stop("SIGTERM");
        } catch {}
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    }

    g.__botStarted = true;
  } catch (error: any) {
    if (String(error?.response?.error_code) === "409") {
      console.error(
        "Telegram 409: another process is polling this token.\n" +
          "Stop the other process OR revoke the token and use the new one.\n" +
          "Tips: close duplicate `next dev`, PM2 workers, Docker containers; or run `/revoke` in @BotFather."
      );
    } else {
      console.error("Failed to start Telegram bot:", error);
    }
  } finally {
    starting = false;
  }
}

export async function handleTelegramUpdate(update: any) {
  try {
    await bot.handleUpdate(update);
  } catch (error) {
    console.error("Error handling Telegram update:", error);
  }
}

/* --------------------------------- Types ----------------------------------- */
type TaskMsg = {
  id: number;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  projectName?: string;
};

type ProfileLite = {
  id: number;
  name?: string;
  telegram_chat_id?: number | string | null;
  email?: string | null;
};

/* ------------------------- Helpers: URLs, formatting ------------------------ */
function isPublicHttpsUrl(u?: string) {
  if (!u) return false;
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

function fmt(s?: string) {
  if (!s) return "";
  return new Date(s).toLocaleString("en-GB", { hour12: false });
}

// Keep escapeMd around in case you switch back to Markdown later
function escapeMd(text: string) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/* ----------------------------- Send Task Message ---------------------------- */
// Plain-text send with conditional inline button (https only). No Markdown fragility.
export async function sendTaskAssignedMsg(
  profile: ProfileLite,
  task: TaskMsg,
  adminEmail: string,
  aiUrl?: string
): Promise<{ ok: boolean; reason?: string; error?: any; message_id?: number }> {
  try {
    if (!profile?.telegram_chat_id) return { ok: false, reason: "no_chat_id" };
    if (!g.__botStarted) await startBot();

    const aiBtnAllowed = isPublicHttpsUrl(aiUrl);
    const textLines = [
      "🆕 Task Assigned",
      `Project: ${task.projectName || "-"}`,
      `Title: ${task.title}`,
      task.description ? `Details: ${task.description.slice(0, 500)}` : null,
      task.startDate ? `Start: ${fmt(task.startDate)}` : null,
      task.endDate ? `End: ${fmt(task.endDate)}` : null,
      "",
      aiBtnAllowed
        ? "If you have questions, tap Ask AI or email Admin."
        : `If you have questions, email Admin: ${adminEmail}`,
      aiBtnAllowed ? "" : (aiUrl ? `AI (open in browser): ${aiUrl}` : ""),
    ]
      .filter(Boolean)
      .join("\n");

    const inline_keyboard: any[] = [];
    if (aiBtnAllowed) inline_keyboard.push([{ text: "🤖 Ask AI", url: aiUrl! }]);
    // No mailto button; Telegram inline button URLs must be http/https/tg.

    const opts: any = {};
    if (inline_keyboard.length) opts.reply_markup = { inline_keyboard };

    const chatId = String(profile.telegram_chat_id).trim();
    console.log("[TELEGRAM] sending", { chatId, title: task.title, aiBtnAllowed });

    try {
      const msg = await bot.telegram.sendMessage(chatId, textLines, opts);
      return { ok: true, message_id: msg.message_id };
    } catch (err: any) {
      const code = err?.response?.error_code;
      const desc = String(err?.response?.description || "");
      console.error("Telegram sendMessage failed:", { code, desc });

      if (code === 400 && /chat not found/i.test(desc)) return { ok: false, reason: "invalid_chat_id" };
      if (code === 403) return { ok: false, reason: "user_blocked_bot" };
      return { ok: false, error: err?.response || err };
    }
  } catch (error) {
    console.error("Unexpected error in sendTaskAssignedMsg:", error);
    return { ok: false, error };
  }
}

/* -------------------------- DB hooks (dynamic import) ----------------------- */
async function findProfileByPhone(phone: string) {
  try {
    // Uses your implementation which matches by last-10 digits
    const { findProfileByPhone } = await import("./profiles");
    return findProfileByPhone(phone);
  } catch (error) {
    console.error("Error in findProfileByPhone:", error);
    return null;
  }
}

async function linkTelegramToProfile(
  profileId: number,
  data: {
    telegram_chat_id: number;
    telegram_username: string | null;
    telegram_opt_in: boolean;
  }
) {
  try {
    const { linkTelegramToProfile } = await import("./profiles");
    return linkTelegramToProfile(profileId, data);
  } catch (error) {
    console.error("Error in linkTelegramToProfile:", error);
    throw error;
  }
}

/* -------------------------- Autostart in this process ----------------------- */
startBot().catch(console.error);
