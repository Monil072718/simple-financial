import { query } from "@/lib/db";

export type User = { id:number; name:string; email:string; created_at:string };

export async function listUsers(): Promise<User[]> {
  const { rows } = await query("SELECT id,name,email,created_at FROM users ORDER BY id DESC");
  return rows;
}
export async function getUser(id:number) {
  const { rows } = await query("SELECT id,name,email,created_at FROM users WHERE id=$1",[id]);
  return rows[0] ?? null;
}
export async function createUser(name:string, email:string) {
  const { rows } = await query(
    "INSERT INTO users(name,email) VALUES($1,$2) RETURNING id,name,email,created_at",
    [name, email]
  );
  return rows[0];
}
export async function updateUser(id:number, name?:string, email?:string) {
  const { rows } = await query(
    `UPDATE users
     SET name=COALESCE($1,name), email=COALESCE($2,email), updated_at=NOW()
     WHERE id=$3 RETURNING id,name,email,created_at`,
    [name ?? null, email ?? null, id]
  );
  return rows[0] ?? null;
}
export async function deleteUser(id:number) {
  await query("DELETE FROM users WHERE id=$1",[id]);
  return true;
}
