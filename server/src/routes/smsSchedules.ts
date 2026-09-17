import { Router } from "express";
import { z } from "zod";
import { requireSmsGateway } from "../middleware/requireSmsGateway.js";
import {
  listPendingSmsSchedules,
  markSmsScheduleFailed,
  markSmsScheduleSent,
} from "../lib/smsSchedule.js";

export const smsSchedulesRouter = Router();

smsSchedulesRouter.use(requireSmsGateway);

const limitSchema = z.coerce.number().int().min(1).max(50).default(20);

/**
 * Due now (scheduledAt <= now). Poll this on a timer and send each SMS.
 */
smsSchedulesRouter.get("/due", async (req, res, next) => {
  try {
    const limit = limitSchema.parse(req.query.limit ?? 20);
    const schedules = await listPendingSmsSchedules({ dueOnly: true, limit });
    res.json({ schedules });
  } catch (e) {
    next(e);
  }
});

/**
 * All unsent schedules, including future day-before reminders.
 * Use scheduledAt to set a local alarm instead of polling.
 */
smsSchedulesRouter.get("/pending", async (req, res, next) => {
  try {
    const limit = limitSchema.parse(req.query.limit ?? 50);
    const schedules = await listPendingSmsSchedules({ dueOnly: false, limit });
    res.json({ schedules });
  } catch (e) {
    next(e);
  }
});

smsSchedulesRouter.post("/:id/sent", async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const ok = await markSmsScheduleSent(id);
    if (!ok) {
      res.status(404).json({ error: "Schedule not found or already finished" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

const failedSchema = z.object({
  error: z.string().max(500).optional(),
});

smsSchedulesRouter.post("/:id/failed", async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const body = failedSchema.parse(req.body ?? {});
    const ok = await markSmsScheduleFailed(id, body.error);
    if (!ok) {
      res.status(404).json({ error: "Schedule not found or already finished" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
