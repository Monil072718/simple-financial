// src/lib/users.ts
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

/** Public shape (safe to return to clients) */
export type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

/** Internal-only shape (not exported to clients) */
type UserWithHash = User & { password_hash: string };

const SALT_ROUNDS = 12;

/** List users (never return password_hash) */
export async function listUsers(): Promise<User[]> {
  // NOTE: list = no WHERE id=$1 ; return all users ordered by newest
  const { rows } = await query<User>(
    "SELECT id, name, email, created_at FROM public.users ORDER BY id DESC"
  );
  return rows;
}

/** Get one user by id (without password_hash) */
export async function getUser(id: number): Promise<User | null> {
  const { rows } = await query<User>(
    "SELECT id, name, email, created_at FROM public.users WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

/** Internal helper for auth/login – includes password_hash. Do NOT expose via API. */
export async function getUserWithHashByEmail(email: string): Promise<UserWithHash | null> {
  const { rows } = await query<UserWithHash>(
    "SELECT id, name, email, created_at, password_hash FROM public.users WHERE email = $1",
    [email]
  );
  return rows[0] ?? null;
}

/** Create user WITH password (hashing). */
export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await query<User>(
    `INSERT INTO public.users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, password_hash]
  );
  return rows[0];
}

/**
 * Update user fields; if newPassword is provided, it will be re-hashed and stored.
 * Returns only public fields (never password_hash).
 */
export async function updateUser(
  id: number,
  name?: string,
  email?: string,
  newPassword?: string
): Promise<User | null> {
  if (newPassword) {
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const { rows } = await query<User>(
      `UPDATE public.users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           password_hash = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, created_at`,
      [name ?? null, email ?? null, password_hash, id]
    );
    return rows[0] ?? null;
  }

  const { rows } = await query<User>(
    `UPDATE public.users
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, name, email, created_at`,
    [name ?? null, email ?? null, id]
  );
  return rows[0] ?? null;
}

/** Delete user by id */
export async function deleteUser(id: number): Promise<boolean> {
  await query("DELETE FROM public.users WHERE id = $1", [id]);
  return true;
}

/**
 * Verify a user's password by email.
 * Returns the public user on success; null on failure.
 */
export async function verifyPassword(email: string, plain: string): Promise<User | null> {
  const row = await getUserWithHashByEmail(email);
  if (!row) return null;

  const ok = await bcrypt.compare(plain, row.password_hash);
  if (!ok) return null;

  const { password_hash, ...publicUser } = row;
  return publicUser as User;
}
