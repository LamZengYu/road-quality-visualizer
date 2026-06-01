import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import * as users from "../models/user.model";

const sign = (id: number, email: string) =>
  jwt.sign({ id, email }, env.jwtSecret, { expiresIn: "7d" });

export async function register(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: { code: "BAD_INPUT", message: "email and password required" } });
  }
  if (await users.findByEmail(email)) {
    return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "Email already registered" } });
  }
  const hash = await bcrypt.hash(password, 12);
  const id = await users.create(email, hash);
  res.json({ token: sign(id, email) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  const u = await users.findByEmail(email);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    return res.status(401).json({ error: { code: "BAD_CREDENTIALS", message: "Invalid email or password" } });
  }
  res.json({ token: sign(u.id, u.email) });
}
