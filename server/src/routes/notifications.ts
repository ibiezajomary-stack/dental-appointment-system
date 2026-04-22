import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { Role } from "@prisma/client";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/unread-count",
  requireAuth,
  requireRole(Role.PATIENT),
  async (req: AuthedRequest, res, next) => {
    try {
      const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
      if (!patient) {
        res.status(400).json({ error: "Patient profile missing" });
        return;
      }
      const unread = await prisma.notification.count({
        where: { patientId: patient.id, readAt: null },
      });
      res.json({ unread });
    } catch (e) {
      next(e);
    }
  },
);

notificationsRouter.get("/", requireAuth, requireRole(Role.PATIENT), async (req: AuthedRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    if (!patient) {
      res.status(400).json({ error: "Patient profile missing" });
      return;
    }
    const list = await prisma.notification.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const markReadSchema = z.object({
  readAt: z.string().datetime().nullable().optional(),
});

notificationsRouter.patch("/:id/read", requireAuth, requireRole(Role.PATIENT), async (req: AuthedRequest, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const body = markReadSchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    if (!patient) {
      res.status(400).json({ error: "Patient profile missing" });
      return;
    }
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.patientId !== patient.id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: body.readAt === null ? null : body.readAt ? new Date(body.readAt) : new Date() },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

