import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { generateSlotsForDay } from "../lib/slots.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { Role } from "@prisma/client";

export const dentistsRouter = Router();

dentistsRouter.get("/", async (_req, res, next) => {
  try {
    const list = await prisma.dentist.findMany({
      include: {
        user: { select: { email: true } },
        unavailableBlocks: true,
      },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

dentistsRouter.get("/:id/slots", async (req, res, next) => {
  try {
    const { id } = req.params;
    const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    const day = new Date(`${dateStr}T00:00:00.000Z`);
    const dentist = await prisma.dentist.findUnique({
      where: { id },
      include: { unavailableBlocks: true },
    });
    if (!dentist) {
      res.status(404).json({ error: "Dentist not found" });
      return;
    }
    const dayEnd = new Date(day);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const existing = await prisma.appointment.findMany({
      where: {
        dentistId: id,
        status: { not: "CANCELLED" },
        startAt: { gte: day, lt: dayEnd },
      },
    });
    const clinicBlocks = await prisma.clinicTimeBlock.findMany({
      where: {
        startAt: { lt: dayEnd },
        endAt: { gt: day },
      },
    });
    const dentistDateBlocks = await prisma.dentistDateBlock.findMany({
      where: {
        dentistId: id,
        startAt: { lt: dayEnd },
        endAt: { gt: day },
      },
    });
    const slots = generateSlotsForDay(day, dentist.unavailableBlocks, existing, clinicBlocks, dentistDateBlocks);
    res.json(
      slots.map((s) => ({
        startAt: s.start.toISOString(),
        endAt: s.end.toISOString(),
      })),
    );
  } catch (e) {
    next(e);
  }
});

const dateBlockSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().optional(),
  })
  .refine((v) => new Date(v.startAt) < new Date(v.endAt), { message: "endAt must be after startAt" });

dentistsRouter.get(
  "/me/date-blocks",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const list = await prisma.dentistDateBlock.findMany({
        where: { dentistId: dentist.id },
        orderBy: { startAt: "desc" },
        take: 200,
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  },
);

dentistsRouter.post(
  "/me/date-blocks",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const body = dateBlockSchema.parse(req.body);
      const startAt = new Date(body.startAt);
      const endAt = new Date(body.endAt);
      const created = await prisma.dentistDateBlock.create({
        data: {
          dentistId: dentist.id,
          startAt,
          endAt,
          reason: body.reason?.trim() || null,
        },
      });
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  },
);

dentistsRouter.delete(
  "/me/date-blocks/:id",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const existing = await prisma.dentistDateBlock.findUnique({ where: { id } });
      if (!existing || existing.dentistId !== dentist.id) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      await prisma.dentistDateBlock.delete({ where: { id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

const dentistProfilePatch = z.object({
  displayName: z.string().min(1).optional().nullable(),
  phone: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

dentistsRouter.get(
  "/me/profile",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({
        where: { userId: req.userId! },
        include: { user: { select: { email: true } } },
      });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      res.json(dentist);
    } catch (e) {
      next(e);
    }
  },
);

dentistsRouter.patch(
  "/me/profile",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const patch = dentistProfilePatch.parse(req.body);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const updated = await prisma.dentist.update({
        where: { id: dentist.id },
        data: {
          displayName: patch.displayName ?? undefined,
          phone: patch.phone ?? undefined,
          licenseNumber: patch.licenseNumber ?? undefined,
          specialty: patch.specialty ?? undefined,
          bio: patch.bio ?? undefined,
        },
        include: { user: { select: { email: true } } },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

const unavailableBlockRow = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinutes: z.number().int().min(0).max(24 * 60 - 1),
    endMinutes: z.number().int().min(1).max(24 * 60),
  })
  .refine((r) => r.startMinutes < r.endMinutes, { message: "startMinutes must be before endMinutes" });

const putUnavailableSchema = z.object({
  unavailableBlocks: z.array(unavailableBlockRow),
});

dentistsRouter.put(
  "/me/unavailable-blocks",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = putUnavailableSchema.parse(req.body);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const creates = body.unavailableBlocks.map((w) => ({
        dentistId: dentist.id,
        dayOfWeek: w.dayOfWeek,
        startMinutes: w.startMinutes,
        endMinutes: w.endMinutes,
      }));
      await prisma.$transaction([
        prisma.dentistUnavailableBlock.deleteMany({ where: { dentistId: dentist.id } }),
        ...(creates.length > 0
          ? [prisma.dentistUnavailableBlock.createMany({ data: creates })]
          : []),
      ]);
      const updated = await prisma.dentist.findUnique({
        where: { id: dentist.id },
        include: { unavailableBlocks: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

dentistsRouter.get(
  "/me/unavailable-blocks",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({
        where: { userId: req.userId! },
        include: { unavailableBlocks: true },
      });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      res.json(dentist.unavailableBlocks);
    } catch (e) {
      next(e);
    }
  },
);
