// src/app/api/telegram/send-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendTaskAssignedMsg } from "@/lib/telegram";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";

/** Minimal shape we expect from the DB profile */
type DbProfile = {
  id: number;
  full_name: string;
  email: string | null;
  telegram_chat_id: string | number | null;
};

/** The compact profile we pass to the Telegram sender */
type LiteProfile = {
  id: number;
  name: string;
  telegram_chat_id: string; // normalized numeric string
  email: string | null;
};

/** Validate incoming body with the least assumptions */
const TaskSchema = z
  .object({
    id: z.number().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    url: z.string().url().optional(),
  })
  .passthrough();

const BodySchema = z.object({
  profileId: z.union([z.string(), z.number()]),
  task: TaskSchema.optional(),
  adminEmail: z.string().email().optional(),
  aiUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    console.log("[SEND] hit /telegram/send-message");

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profileId, task, adminEmail, aiUrl } = parsed.data;
    const pid = typeof profileId === "string" ? Number(profileId) : profileId;

    if (!Number.isFinite(pid)) {
      return NextResponse.json(
        { ok: false, error: "Invalid profileId" },
        { status: 400 }
      );
    }

    // getProfile is external; cast to a precise type instead of using `any`
    const profile = (await getProfile(pid)) as DbProfile | null;
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    // Normalize and validate chat id from DB without `any`
    const rawChat = String(profile.telegram_chat_id ?? "").trim();
    const chatId = rawChat.replace(/\s+/g, "");
    if (!/^-?\d+$/.test(chatId)) {
      console.error("[SEND] bad chat id format", { rawChat, chatId });
      return NextResponse.json(
        { ok: false, reason: "invalid_chat_id_format" },
        { status: 400 }
      );
    }

    // Map to the expected structure for the sender
    const profileLite: LiteProfile = {
      id: profile.id,
      name: profile.full_name,
      telegram_chat_id: chatId,
      email: profile.email,
    };

    if (!task) {
      return NextResponse.json(
        { ok: false, error: "Task is required" },
        { status: 400 }
      );
    }

    // Map task to TaskMsg format
    const taskMsg = {
      id: task.id ?? 0,
      title: task.title,
      description: task.description,
      projectName: undefined,
      priority: undefined,
      endDate: undefined,
      referenceLink: task.url,
      aiComm: undefined,
    };

    console.log("[SEND] sending", {
      chat: profileLite.telegram_chat_id,
      title: task.title,
    });

    const result = await sendTaskAssignedMsg(
      profileLite,
      taskMsg,
      adminEmail ?? "admin@example.com",
      aiUrl
    );

    console.log("[SEND] result", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[SEND] error", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
