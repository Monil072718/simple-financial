// src/app/api/telegram/send-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendTaskAssignedMsg } from "@/lib/telegram";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    console.log("[SEND] hit /telegram/send-message");
    const { profileId, task, adminEmail, aiUrl } = await req.json();

    const profile = await getProfile(Number(profileId));
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    // Normalize and validate chat id from DB
    const rawChat = String((profile as any).telegram_chat_id ?? "").trim();
    const chatId = rawChat.replace(/\s+/g, "");
    if (!/^-?\d+$/.test(chatId)) {
      console.error("[SEND] bad chat id format", { rawChat, chatId });
      return NextResponse.json(
        { ok: false, reason: "invalid_chat_id_format" },
        { status: 400 }
      );
    }

    // Map to the expected structure for the sender
    const profileLite = {
      id: profile.id,
      name: profile.full_name,              // map full_name -> name
      telegram_chat_id: chatId,             // pass normalized numeric string
      email: profile.email,
    };

    console.log("[SEND] sending", {
      chat: profileLite.telegram_chat_id,
      title: task?.title,
    });

    const result = await sendTaskAssignedMsg(profileLite, task, adminEmail, aiUrl);
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
