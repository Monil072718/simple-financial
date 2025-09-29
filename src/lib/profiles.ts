import { query } from "@/lib/db";

type ListParams = {
  q?: string;
  page?: number;
  limit?: number;
};

export async function listProfiles({ q, page = 1, limit = 20 }: ListParams) {
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = "";

  if (q && q.trim()) {
    params.push(`%${q}%`);
    where = `WHERE full_name ILIKE $${params.length} OR coalesce(title,'') ILIKE $${params.length} OR coalesce(email,'') ILIKE $${params.length}`;
  }

  const { rows } = await query(
    `SELECT id, user_id, full_name, title, description, email, phone, linkedin_url, github_url,
            languages, admin_feedback, resume_url, created_at, updated_at
       FROM profiles
       ${where}
       ORDER BY id DESC
       LIMIT ${limit} OFFSET ${offset}`,
    params.length ? [...params, ...params.slice(-1)] : []
  );

  return rows;
}

export async function getProfile(id: number) {
  const { rows } = await query(
    `SELECT id, user_id, full_name, title, description, email, phone, linkedin_url, github_url,
            languages, admin_feedback, resume_url, created_at, updated_at
       FROM profiles
      WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createProfile(data: any) {
  const { rows } = await query(
    `INSERT INTO profiles
      (user_id, full_name, title, description, email, phone, linkedin_url, github_url,
       languages, admin_feedback, resume_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, user_id, full_name, title, description, email, phone, linkedin_url, github_url,
               languages, admin_feedback, resume_url, created_at, updated_at`,
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

export async function updateProfile(id: number, data: any) {
  const { rows } = await query(
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
      RETURNING id, user_id, full_name, title, description, email, phone, linkedin_url, github_url,
                languages, admin_feedback, resume_url, created_at, updated_at`,
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
