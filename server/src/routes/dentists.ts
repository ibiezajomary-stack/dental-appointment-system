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
        workingHours: true,
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
      include: { workingHours: true },
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
    const slots = generateSlotsForDay(day, dentist.workingHours, existing);
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

const workingHourRow = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(24 * 60 - 1),
  endMinutes: z.number().int().min(1).max(24 * 60),
});

const putHoursSchema = z.object({
  workingHours: z.array(workingHourRow).min(1),
});

dentistsRouter.put(
  "/me/working-hours",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = putHoursSchema.parse(req.body);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      await prisma.$transaction([
        prisma.dentistWorkingHour.deleteMany({ where: { dentistId: dentist.id } }),
        prisma.dentistWorkingHour.createMany({
          data: body.workingHours.map((w) => ({
            dentistId: dentist.id,
            dayOfWeek: w.dayOfWeek,
            startMinutes: w.startMinutes,
            endMinutes: w.endMinutes,
          })),
        }),
      ]);
      const updated = await prisma.dentist.findUnique({
        where: { id: dentist.id },
        include: { workingHours: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

dentistsRouter.get(
  "/me/working-hours",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({
        where: { userId: req.userId! },
        include: { workingHours: true },
      });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      res.json(dentist.workingHours);
    } catch (e) {
      next(e);
    }
  },
);
