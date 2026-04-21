import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { ConsultationStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const consultationsRouter = Router();

const createSchema = z.object({
  dentistId: z.string(),
  appointmentId: z.string().optional(),
  reason: z.string().optional(),
});

const patchSchema = z.object({
  status: z.nativeEnum(ConsultationStatus).optional(),
  videoRoomId: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

const noteSchema = z.object({
  diagnosis: z.string().optional(),
  prescribedMedication: z.string().optional(),
  notes: z.string().optional(),
  treatmentPlan: z.string().optional(),
});

consultationsRouter.post("/", requireAuth, requireRole(Role.PATIENT), async (req: AuthedRequest, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    if (!patient) {
      res.status(400).json({ error: "Patient profile missing" });
      return;
    }
    const roomId = `dental-${randomUUID().slice(0, 8)}`;
    const c = await prisma.consultation.create({
      data: {
        patientId: patient.id,
        dentistId: body.dentistId,
        appointmentId: body.appointmentId,
        status: ConsultationStatus.REQUESTED,
        videoRoomId: roomId,
      },
      include: {
        dentist: { include: { user: { select: { email: true } } } },
        patient: true,
      },
    });
    res.status(201).json(c);
  } catch (e) {
    next(e);
  }
});

consultationsRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });

    let list;
    if (req.role === Role.PATIENT && patient) {
      list = await prisma.consultation.findMany({
        where: { patientId: patient.id },
        include: {
          dentist: { include: { user: { select: { email: true } } } },
          notes: true,
          appointment: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (req.role === Role.DENTIST && dentist) {
      list = await prisma.consultation.findMany({
        where: { dentistId: dentist.id },
        include: {
          patient: true,
          notes: true,
          appointment: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (req.role === Role.ADMIN) {
      list = await prisma.consultation.findMany({
        include: {
          patient: true,
          dentist: { include: { user: { select: { email: true } } } },
          notes: true,
          appointment: true,
        },
        orderBy: { createdAt: "desc" },
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

consultationsRouter.get("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const c = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: true,
        dentist: { include: { user: { select: { email: true } } } },
        notes: true,
        appointment: true,
      },
    });
    if (!c) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
    const isPatient = req.role === Role.PATIENT && patient?.id === c.patientId;
    const isDentist = req.role === Role.DENTIST && dentist?.id === c.dentistId;
    const isAdmin = req.role === Role.ADMIN;
    if (!isPatient && !isDentist && !isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(c);
  } catch (e) {
    next(e);
  }
});

consultationsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const body = patchSchema.parse(req.body);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      const existing = await prisma.consultation.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (req.role === Role.DENTIST && existing.dentistId !== dentist?.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const updated = await prisma.consultation.update({
        where: { id },
        data: {
          ...(body.status !== undefined && { status: body.status }),
          ...(body.videoRoomId !== undefined && { videoRoomId: body.videoRoomId }),
          ...(body.startedAt !== undefined && { startedAt: new Date(body.startedAt) }),
          ...(body.endedAt !== undefined && { endedAt: new Date(body.endedAt) }),
        },
        include: { patient: true, dentist: { include: { user: { select: { email: true } } } } },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

// Dentist starts the call session (patient can only join once started).
consultationsRouter.post(
  "/:id/start-call",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      const existing = await prisma.consultation.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (req.role === Role.DENTIST && existing.dentistId !== dentist?.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const updated = await prisma.consultation.update({
        where: { id },
        data: {
          status: ConsultationStatus.IN_PROGRESS,
          startedAt: existing.startedAt ?? new Date(),
          videoRoomId: existing.videoRoomId ?? `dental-${randomUUID().slice(0, 8)}`,
        },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

// Dentist starts the call session for a patient-booked virtual appointment.
// If a consultation record doesn't exist yet, it will be created and linked to the appointment.
consultationsRouter.post(
  "/by-appointment/:appointmentId/start-call",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const appointmentId =
        typeof req.params.appointmentId === "string" ? req.params.appointmentId : req.params.appointmentId[0];

      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (req.role === Role.DENTIST && !dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }

      const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appt) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }
      if (req.role === Role.DENTIST && appt.dentistId !== dentist!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const existing = await prisma.consultation.findFirst({ where: { appointmentId } });
      const c =
        existing ??
        (await prisma.consultation.create({
          data: {
            patientId: appt.patientId,
            dentistId: appt.dentistId,
            appointmentId,
            status: ConsultationStatus.SCHEDULED,
            videoRoomId: `dental-${randomUUID().slice(0, 8)}`,
          },
        }));

      const updated = await prisma.consultation.update({
        where: { id: c.id },
        data: {
          status: ConsultationStatus.IN_PROGRESS,
          startedAt: c.startedAt ?? new Date(),
          videoRoomId: c.videoRoomId ?? `dental-${randomUUID().slice(0, 8)}`,
        },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

consultationsRouter.post(
  "/:id/notes",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const body = noteSchema.parse(req.body);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      const existing = await prisma.consultation.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (req.role === Role.DENTIST && existing.dentistId !== dentist?.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const note = await prisma.consultationNote.create({
        data: {
          consultationId: id,
          createdById: req.userId!,
          diagnosis: body.diagnosis,
          prescribedMedication: body.prescribedMedication,
          notes: body.notes,
          treatmentPlan: body.treatmentPlan,
        },
      });
      res.status(201).json(note);
    } catch (e) {
      next(e);
    }
  },
);
