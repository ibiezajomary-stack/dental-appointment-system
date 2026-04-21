import { Router } from "express";
import { z } from "zod";
import { AppointmentStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import crypto from "node:crypto";

export const appointmentsRouter = Router();

function isVirtualFromNotes(notes: string | undefined): boolean {
  return /Visit:\s*Virtual/i.test(notes ?? "");
}

const createSchema = z.object({
  dentistId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
});

const patchSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().optional(),
});

appointmentsRouter.post("/", requireAuth, requireRole(Role.PATIENT), async (req: AuthedRequest, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    if (!patient) {
      res.status(400).json({ error: "Patient profile missing" });
      return;
    }
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (!(startAt < endAt)) {
      res.status(400).json({ error: "startAt must be before endAt" });
      return;
    }

    const created = await prisma.$transaction(async (tx) => {
      const clash = await tx.appointment.findFirst({
        where: {
          dentistId: body.dentistId,
          status: { not: AppointmentStatus.CANCELLED },
          AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
        },
      });
      if (clash) {
        throw new Error("SLOT_TAKEN");
      }
      return tx.appointment.create({
        data: {
          patientId: patient.id,
          dentistId: body.dentistId,
          startAt,
          endAt,
          status: AppointmentStatus.PENDING,
          notes: body.notes,
        },
        include: {
          dentist: { include: { user: { select: { email: true } } } },
          patient: true,
        },
      });
    });

    // If this appointment is virtual, create a linked consultation record (shown in Virtual Consultation pages).
    if (isVirtualFromNotes(body.notes)) {
      // Safe to run outside the transaction since clash-check already happened; consult creation doesn't affect slot availability.
      const apptId = created.id;
      const exists = await prisma.consultation.findFirst({ where: { appointmentId: apptId } });
      if (!exists) {
        await prisma.consultation.create({
          data: {
            patientId: created.patientId,
            dentistId: created.dentistId,
            appointmentId: apptId,
            status: "SCHEDULED",
            videoRoomId: `dental-${crypto.randomUUID().slice(0, 8)}`,
          },
        });
      }
    }

    res.status(201).json(created);
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      res.status(409).json({ error: "That time slot is no longer available" });
      return;
    }
    next(e);
  }
});

appointmentsRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });

    let list;
    if (req.role === Role.PATIENT && patient) {
      list = await prisma.appointment.findMany({
        where: { patientId: patient.id },
        include: {
          dentist: { include: { user: { select: { email: true } } } },
        },
        orderBy: { startAt: "asc" },
      });
    } else if ((req.role === Role.DENTIST || req.role === Role.ADMIN) && dentist) {
      list = await prisma.appointment.findMany({
        where: req.role === Role.ADMIN ? {} : { dentistId: dentist.id },
        include: {
          patient: true,
          dentist: { include: { user: { select: { email: true } } } },
        },
        orderBy: { startAt: "asc" },
      });
    } else if (req.role === Role.ADMIN) {
      list = await prisma.appointment.findMany({
        include: {
          patient: true,
          dentist: { include: { user: { select: { email: true } } } },
        },
        orderBy: { startAt: "asc" },
      });
    } else {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(list);
  } catch (e) {
    next(e);
  }
});

appointmentsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const body = patchSchema.parse(req.body);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (req.role === Role.DENTIST && existing.dentistId !== dentist?.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          ...(body.status !== undefined && { status: body.status }),
          ...(body.notes !== undefined && { notes: body.notes }),
        },
        include: { patient: true, dentist: { include: { user: { select: { email: true } } } } },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

appointmentsRouter.delete(
  "/:id",
  requireAuth,
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      const isPatientOwner = req.role === Role.PATIENT && patient?.id === existing.patientId;
      const isDentistOwner = req.role === Role.DENTIST && dentist?.id === existing.dentistId;
      const isAdmin = req.role === Role.ADMIN;
      if (!isPatientOwner && !isDentistOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const updated = await prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);
