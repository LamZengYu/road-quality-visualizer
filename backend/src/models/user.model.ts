import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
}

export async function create(email: string, passwordHash: string): Promise<number> {
  const [r] = await pool.execute<ResultSetHeader>(
    "INSERT INTO users (email, password_hash) VALUES (:email, :hash)",
    { email, hash: passwordHash }
  );
  return r.insertId;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const [rows] = await pool.execute<UserRow[]>(
    "SELECT * FROM users WHERE email = :email",
    { email }
  );
  return rows[0] ?? null;
}
