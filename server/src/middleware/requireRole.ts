import type { Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import type { AuthedRequest } from "./requireAuth.js";

export function requireRole(...allowed: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.role || !allowed.includes(req.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
