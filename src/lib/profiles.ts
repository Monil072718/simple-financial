import { query } from "@/lib/db";

export type ProfileRow = {
  id: number;
  user_id: number | null;
  full_name: string;
  title: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  languages: string[];
  admin_feedback: string | null;
  resume_url: string | null;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  telegram_opt_in: boolean | null;
  created_at: string;
  updated_at: string;
};

export type ListParams = {
  q?: string;
  page?: number;
  limit?: number;
};

export type CreateProfileInput = {
  userId?: number | null;
  fullName: string;
  title?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  languages?: string[];
  adminFeedback?: string | null;
  resumeUrl?: string | null;
};

export type UpdateProfileInput = Partial<CreateProfileInput>;

export function listProfiles(
  page?: number,
  limit?: number
): Promise<ProfileRow[]>;
export function listProfiles(params?: ListParams): Promise<ProfileRow[]>;
export async function listProfiles(
  a?: number | ListParams,
  b?: number
): Promise<ProfileRow[]> {
  let q: string | undefined;
  let page = 1;
  let limit = 20;

  if (typeof a === "object" || a === undefined) {
    q = a?.q?.trim() || undefined;
    page = a?.page ?? 1;
    limit = a?.limit ?? 20;
  } else {
    page = a ?? 1;
    limit = b ?? 20;
  }

  const offset = (page - 1) * limit;
  const params: unknown[] = [];
  let where = "";

  if (q) {
    params.push(`%${q}%`);
    const p1 = params.length;
    params.push(`%${q}%`);
    const p2 = params.length;
    params.push(`%${q}%`);
    const p3 = params.length;
    where = `
      WHERE full_name ILIKE $${p1}
         OR COALESCE(title,'') ILIKE $${p2}
         OR COALESCE(email,'') ILIKE $${p3}
    `;
  }

  params.push(limit);
  const pLimit = params.length;
  params.push(offset);
  const pOffset = params.length;

  const { rows } = await query<ProfileRow>(
    `SELECT id, user_id, full_name, title, description, email, phone, linkedin_url, github_url,
            languages, admin_feedback, resume_url, created_at, updated_at
       FROM profiles
       ${where}
       ORDER BY id DESC
       LIMIT $${pLimit} OFFSET $${pOffset}`,
    params
  );

  return rows;
}

export async function getProfile(id: number) {
  const { rows } = await query<ProfileRow>(
    `SELECT * FROM profiles WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createProfile(data: CreateProfileInput) {
  const { rows } = await query<ProfileRow>(
    `INSERT INTO profiles
      (user_id, full_name, title, description, email, phone, linkedin_url, github_url,
       languages, admin_feedback, resume_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      data.userId ?? null,
      data.fullName,
      data.title ?? null,
      data.description ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.linkedinUrl ?? null,
      data.githubUrl ?? null,
      (data.languages ?? []) as string[],
      data.adminFeedback ?? null,
      data.resumeUrl ?? null,
    ]
  );
  return rows[0];
}

export async function updateProfile(id: number, data: UpdateProfileInput) {
  const { rows } = await query<ProfileRow>(
    `UPDATE profiles SET
        user_id        = COALESCE($1, user_id),
        full_name      = COALESCE($2, full_name),
        title          = COALESCE($3, title),
        description    = COALESCE($4, description),
        email          = COALESCE($5, email),
        phone          = COALESCE($6, phone),
        linkedin_url   = COALESCE($7, linkedin_url),
        github_url     = COALESCE($8, github_url),
        languages      = COALESCE($9, languages),
        admin_feedback = COALESCE($10, admin_feedback),
        resume_url     = COALESCE($11, resume_url),
        updated_at     = NOW()
      WHERE id = $12
      RETURNING *`,
    [
      data.userId ?? null,
      data.fullName ?? null,
      data.title ?? null,
      data.description ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.linkedinUrl ?? null,
      data.githubUrl ?? null,
      data.languages ?? null,
      data.adminFeedback ?? null,
      data.resumeUrl ?? null,
      id,
    ]
  );
  return rows[0] ?? null;
}

export async function deleteProfile(id: number) {
  await query("DELETE FROM profiles WHERE id = $1", [id]);
  return true;
}
// src/lib/profiles.ts (or wherever this lives)
export async function findProfileByPhone(rawPhone: string) {
  // Keep digits only
  const onlyDigits = rawPhone.replace(/\D/g, "");
  // Use last 10 digits for matching (tweak to 8–12 if your domain needs)
  const last10 = onlyDigits.slice(-10);

  const { rows } = await query<{ id: number; phone: string }>(
    `
    SELECT id, phone
    FROM profiles
    WHERE RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = $1
    LIMIT 1
    `,
    [last10]
  );

  return rows[0] || null;
}

export async function linkTelegramToProfile(
  profileId: number,
  data: {
    telegram_chat_id: number;
    telegram_username: string | null;
    telegram_opt_in: boolean;
  }
) {
  await query(
    `UPDATE profiles
     SET telegram_chat_id = $1,
         telegram_username = $2,
         telegram_opt_in = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [
      data.telegram_chat_id,
      data.telegram_username,
      data.telegram_opt_in,
      profileId,
    ]
  );
  return true;
}
export async function getProfileLiteById(profileId: number) {
  const { rows } = await query<{
    id: number;
    full_name: string | null;
    telegram_chat_id: number | null;
  }>(
    `
    SELECT id, full_name, telegram_chat_id
    FROM profiles
    WHERE id = $1
    LIMIT 1
    `,
    [profileId]
  );

  return rows[0] || null;
}
