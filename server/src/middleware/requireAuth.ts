import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { verifyToken } from "../lib/jwt.js";

export type AuthedRequest = Request & {
  userId?: string;
  role?: Role;
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.role = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
