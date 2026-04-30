import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const adminNotificationsRouter = Router();

adminNotificationsRouter.get(
  "/me",
  requireAuth,
  requireRole(Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const list = await prisma.adminNotification.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  },
);

adminNotificationsRouter.get(
  "/me/unread-count",
  requireAuth,
  requireRole(Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const unread = await prisma.adminNotification.count({
        where: { userId: req.userId!, readAt: null },
      });
      res.json({ unread });
    } catch (e) {
      next(e);
    }
  },
);

const markReadSchema = z.object({
  readAt: z.string().datetime().nullable().optional(),
});

adminNotificationsRouter.patch(
  "/me/:id/read",
  requireAuth,
  requireRole(Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const body = markReadSchema.parse(req.body);
      const existing = await prisma.adminNotification.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.userId) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const updated = await prisma.adminNotification.update({
        where: { id },
        data: { readAt: body.readAt === null ? null : body.readAt ? new Date(body.readAt) : new Date() },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);
