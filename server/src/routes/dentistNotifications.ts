import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const dentistNotificationsRouter = Router();

dentistNotificationsRouter.get(
  "/me",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const list = await prisma.dentistNotification.findMany({
        where: { dentistId: dentist.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  },
);

dentistNotificationsRouter.get(
  "/me/unread-count",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const unread = await prisma.dentistNotification.count({ where: { dentistId: dentist.id, readAt: null } });
      res.json({ unread });
    } catch (e) {
      next(e);
    }
  },
);

const markReadSchema = z.object({
  readAt: z.string().datetime().nullable().optional(),
});

dentistNotificationsRouter.patch(
  "/me/:id/read",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const body = markReadSchema.parse(req.body);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const existing = await prisma.dentistNotification.findUnique({ where: { id } });
      if (!existing || existing.dentistId !== dentist.id) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const updated = await prisma.dentistNotification.update({
        where: { id },
        data: { readAt: body.readAt === null ? null : body.readAt ? new Date(body.readAt) : new Date() },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

