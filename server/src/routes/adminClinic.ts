import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { Role } from "@prisma/client";

export const adminClinicRouter = Router();

const createBlockSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().optional(),
});

const updateClinicSettingsSchema = z.object({
  clinicPhone: z.string().trim().max(32).optional().nullable(),
  supportPhone: z.string().trim().max(32).optional().nullable(),
});

adminClinicRouter.get(
  "/clinic-settings",
  requireAuth,
  requireRole(Role.ADMIN),
  async (_req: AuthedRequest, res, next) => {
    try {
      const row = await prisma.clinicSettings.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default" },
      });
      res.json({
        clinicPhone: row.clinicPhone,
        supportPhone: row.supportPhone,
        updatedAt: row.updatedAt,
      });
    } catch (e) {
      next(e);
    }
  },
);

adminClinicRouter.patch(
  "/clinic-settings",
  requireAuth,
  requireRole(Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = updateClinicSettingsSchema.parse(req.body);
      const row = await prisma.clinicSettings.upsert({
        where: { id: "default" },
        update: {
          ...(body.clinicPhone !== undefined ? { clinicPhone: body.clinicPhone || null } : {}),
          ...(body.supportPhone !== undefined ? { supportPhone: body.supportPhone || null } : {}),
        },
        create: {
          id: "default",
          clinicPhone: body.clinicPhone ?? null,
          supportPhone: body.supportPhone ?? null,
        },
      });
      res.json({
        clinicPhone: row.clinicPhone,
        supportPhone: row.supportPhone,
        updatedAt: row.updatedAt,
      });
    } catch (e) {
      next(e);
    }
  },
);

adminClinicRouter.get(
  "/clinic-time-blocks",
  requireAuth,
  requireRole(Role.ADMIN),
  async (_req: AuthedRequest, res, next) => {
    try {
      const list = await prisma.clinicTimeBlock.findMany({
        orderBy: { startAt: "desc" },
        include: { createdBy: { select: { email: true } } },
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  },
);

adminClinicRouter.post(
  "/clinic-time-blocks",
  requireAuth,
  requireRole(Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = createBlockSchema.parse(req.body);
      const startAt = new Date(body.startAt);
      const endAt = new Date(body.endAt);
      if (!(startAt < endAt)) {
        res.status(400).json({ error: "startAt must be before endAt" });
        return;
      }
      const row = await prisma.clinicTimeBlock.create({
        data: {
          startAt,
          endAt,
          reason: body.reason,
          createdById: req.userId!,
        },
        include: { createdBy: { select: { email: true } } },
      });
      res.status(201).json(row);
    } catch (e) {
      next(e);
    }
  },
);

adminClinicRouter.delete(
  "/clinic-time-blocks/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      await prisma.clinicTimeBlock.delete({ where: { id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);
