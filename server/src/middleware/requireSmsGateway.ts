import type { Request, Response, NextFunction } from "express";
import { config } from "../lib/config.js";

/** Shared secret for the Android SMS gateway app. */
export function requireSmsGateway(req: Request, res: Response, next: NextFunction): void {
  if (!config.smsGatewaySecret) {
    res.status(503).json({ error: "SMS gateway secret is not configured" });
    return;
  }
  if (req.header("authorization") !== `Bearer ${config.smsGatewaySecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
