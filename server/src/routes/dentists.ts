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
    const slots = generateSlotsForDay(day, dentist.unavailableBlocks, existing, clinicBlocks);
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
