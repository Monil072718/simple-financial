import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

import { listProfiles, createProfile } from "@/lib/profiles";
import { profileCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

/** ===== File upload config ===== */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "resumes");

// Simple allowlist
const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** ===== GET: list/search profiles ===== */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? undefined;
  const page = Number(sp.get("page") ?? 1);
  const limit = Number(sp.get("limit") ?? 20);

  const rows = await listProfiles({ q, page, limit });
  return NextResponse.json(rows);
}

/** ===== POST: create profile (JSON or multipart/form-data with resume) ===== */
export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";

  try {
    // --- Multipart form with resume upload ---
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();

      // Read text fields
      const raw = {
        userId: toIntOrNull(form.get("userId")),
        fullName: toStr(form.get("fullName")),
        title: toStrOrNull(form.get("title")),
        description: toStrOrNull(form.get("description")),
        email: toStrOrNull(form.get("email")),
        phone: toStrOrNull(form.get("phone")),
        linkedinUrl: toStrOrNull(form.get("linkedinUrl")),
        githubUrl: toStrOrNull(form.get("githubUrl")),
        languages: toLanguages(form.get("languages")),
        adminFeedback: toStrOrNull(form.get("adminFeedback")),
        resumeUrl: null as string | null, // set after file save (if any)
      };

      // Validate without resumeUrl first (we’ll set it after upload)
      const parsed = profileCreateSchema.omit({ resumeUrl: true }).safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      // Handle resume file (optional)
      const file = form.get("resume");
      if (file && file instanceof File && file.size > 0) {
        if (!ALLOWED_MIME.has(file.type)) {
          return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await mkdir(UPLOAD_DIR, { recursive: true });

        const ext = guessExt(file.type) || getExtFromName(file.name);
        const safeBase =
          crypto.randomBytes(8).toString("hex") +
          "-" +
          (file.name?.replace(/[^\w.\-]+/g, "_") || "resume");
        const finalName = safeBase.endsWith(ext) ? safeBase : `${safeBase}${ext}`;
        const fullPath = path.join(UPLOAD_DIR, finalName);

        await writeFile(fullPath, buffer);

        // Public URL (served by Next.js static from /public)
        raw.resumeUrl = `/uploads/resumes/${finalName}`;
      }

      const created = await createProfile(raw);
      return NextResponse.json(created, { status: 201 });
    }

    // --- JSON body (no file upload) ---
    const json = await req.json().catch(() => ({}));
    const parsed = profileCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const row = await createProfile(parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("Profile create failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/** ===== Helpers ===== */
function toStr(v: FormDataEntryValue | null) {
  return (v ?? "").toString().trim();
}
function toStrOrNull(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
}
function toIntOrNull(v: FormDataEntryValue | null) {
  if (v == null) return null;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : null;
}
function toLanguages(v: FormDataEntryValue | null): string[] {
  if (!v) return [];
  const s = v.toString().trim();
  if (!s) return [];
  // Accept JSON array or comma-separated string
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean);
  } catch {}
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
function guessExt(mime: string) {
  if (mime === "application/pdf") return ".pdf";
  if (mime === "application/msword") return ".doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  return "";
}
function getExtFromName(name?: string) {
  if (!name) return "";
  const m = name.match(/\.[a-zA-Z0-9]+$/);
  return m ? m[0] : "";
}
