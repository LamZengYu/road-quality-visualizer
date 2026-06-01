import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthedRequest extends Request {
  user?: { id: number; email: string };
}

export function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: { code: "NO_TOKEN", message: "Missing token" } });
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret) as { id: number; email: string };
    next();
  } catch {
    return res.status(401).json({ error: { code: "BAD_TOKEN", message: "Invalid token" } });
  }
}
