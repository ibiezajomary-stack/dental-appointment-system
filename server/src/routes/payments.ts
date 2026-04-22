import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { PaymentProvider, PaymentVerificationStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import crypto from "node:crypto";

export const paymentsRouter = Router();

function toBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Uint8Array<ArrayBuffer>(ab);
}

function isVirtualFromNotes(notes: string | undefined): boolean {
  return /Visit:\s*Virtual/i.test(notes ?? "");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype);
    if (!ok) {
      cb(new Error("Only images (JPEG, PNG, GIF, WebP) allowed"));
      return;
    }
    cb(null, true);
  },
});

const createPaymentSchema = z.object({
  dentistId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
  amountCents: z.coerce.number().int().nonnegative().default(0),
});

paymentsRouter.post(
  "/appointments",
  requireAuth,
  requireRole(Role.PATIENT),
  upload.fields([
    { name: "proof", maxCount: 1 },
    { name: "teethPhoto", maxCount: 1 },
  ]),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = createPaymentSchema.parse(req.body);
      const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
      if (!patient) {
        res.status(400).json({ error: "Patient profile missing" });
        return;
      }
      const dentist = await prisma.dentist.findUnique({ where: { id: body.dentistId } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist not found" });
        return;
      }
      const startAt = new Date(body.startAt);
      const endAt = new Date(body.endAt);
      if (!(startAt < endAt)) {
        res.status(400).json({ error: "startAt must be before endAt" });
        return;
      }
      const isVirtual = isVirtualFromNotes(body.notes);
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const proof = files?.proof?.[0];
      const teethPhoto = files?.teethPhoto?.[0];
      if (isVirtual && !proof) {
        res.status(400).json({ error: "proof file required" });
        return;
      }

      const created = await prisma.$transaction(async (tx) => {
        const clash = await tx.appointment.findFirst({
          where: {
            dentistId: body.dentistId,
            status: { not: "CANCELLED" },
            AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
          },
        });
        if (clash) {
          throw new Error("SLOT_TAKEN");
        }
        const appt = await tx.appointment.create({
          data: {
            patientId: patient.id,
            dentistId: body.dentistId,
            startAt,
            endAt,
            status: "PENDING",
            notes: body.notes,
          },
          include: {
            dentist: { include: { user: { select: { email: true } } } },
            patient: true,
          },
        });

        await tx.dentistNotification.create({
          data: {
            dentistId: body.dentistId,
            patientId: patient.id,
            title: "New appointment booked",
            message: `${patient.firstName} ${patient.lastName} booked an appointment for ${startAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}.`,
          },
        });

        if (isVirtual) {
          await tx.consultation.create({
            data: {
              patientId: patient.id,
              dentistId: body.dentistId,
              appointmentId: appt.id,
              status: "SCHEDULED",
              videoRoomId: `dental-${crypto.randomUUID().slice(0, 8)}`,
            },
          });
        }

        if (teethPhoto) {
          await tx.storedFile.create({
            data: {
              patientId: patient.id,
              appointmentId: appt.id,
              blob: toBytes(teethPhoto.buffer),
              mimeType: teethPhoto.mimetype,
              originalName: teethPhoto.originalname,
              sizeBytes: teethPhoto.buffer.length,
              uploadedById: req.userId!,
            },
          });
        }

        const payment = proof
          ? await tx.appointmentPayment.create({
              data: {
                appointmentId: appt.id,
                patientId: patient.id,
                dentistId: body.dentistId,
                amountCents: body.amountCents,
                status: PaymentVerificationStatus.PENDING,
                proofBlob: toBytes(proof.buffer),
                proofMimeType: proof.mimetype,
                proofOriginalName: proof.originalname,
              },
            })
          : null;
        return { appointment: appt, payment };
      });

      res.status(201).json({
        appointment: created.appointment,
        payment: created.payment
          ? {
              id: created.payment.id,
              status: created.payment.status,
              amountCents: created.payment.amountCents,
              createdAt: created.payment.createdAt,
            }
          : null,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "SLOT_TAKEN") {
        res.status(409).json({ error: "That time slot is no longer available" });
        return;
      }
      next(e);
    }
  },
);

// Dentist uploads/updates their GCash QR.
paymentsRouter.post(
  "/dentists/me/gcash-qr",
  requireAuth,
  requireRole(Role.DENTIST),
  upload.single("qr"),
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "qr file required" });
        return;
      }
      const phoneNumber = z.string().optional().parse(req.body.phoneNumber);
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const existing = await prisma.dentistPaymentMethod.findUnique({
        where: { dentistId_provider: { dentistId: dentist.id, provider: PaymentProvider.GCASH } },
      });
      const row = await prisma.dentistPaymentMethod.upsert({
        where: { dentistId_provider: { dentistId: dentist.id, provider: PaymentProvider.GCASH } },
        create: {
          dentistId: dentist.id,
          provider: PaymentProvider.GCASH,
          qrBlob: toBytes(req.file.buffer),
          phoneNumber,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
        },
        update: {
          qrBlob: toBytes(req.file.buffer),
          phoneNumber,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
        },
      });
      res.status(201).json({
        id: row.id,
        provider: row.provider,
        originalName: row.originalName,
        phoneNumber: row.phoneNumber,
        updatedAt: row.updatedAt,
      });
    } catch (e) {
      next(e);
    }
  },
);

paymentsRouter.get(
  "/dentists/me/gcash-qr",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const row = await prisma.dentistPaymentMethod.findUnique({
        where: { dentistId_provider: { dentistId: dentist.id, provider: PaymentProvider.GCASH } },
      });
      if (!row) {
        res.status(404).json({ error: "No GCash QR uploaded" });
        return;
      }
      res.json({
        id: row.id,
        provider: row.provider,
        originalName: row.originalName,
        phoneNumber: row.phoneNumber,
        downloadUrl: `/api/payments/dentists/${dentist.id}/gcash-qr`,
        updatedAt: row.updatedAt,
      });
    } catch (e) {
      next(e);
    }
  },
);

paymentsRouter.get(
  "/dentists/:id/gcash-qr",
  async (req: AuthedRequest, res, next) => {
    try {
      const dentistId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const row = await prisma.dentistPaymentMethod.findUnique({
        where: { dentistId_provider: { dentistId, provider: PaymentProvider.GCASH } },
      });
      if (!row) {
        res.status(404).json({ error: "No GCash QR uploaded" });
        return;
      }
      if (row.qrBlob) {
        res.setHeader("Content-Type", row.mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${row.originalName}"`);
        res.send(Buffer.from(row.qrBlob));
        return;
      }
      if (row.qrStoragePath) {
        res.download(row.qrStoragePath, row.originalName);
        return;
      }
      res.status(500).json({ error: "QR data missing" });
    } catch (e) {
      next(e);
    }
  },
);

// Dentist payment management.
paymentsRouter.get(
  "/dentists/me/appointment-payments",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const rows = await prisma.appointmentPayment.findMany({
        where: { dentistId: dentist.id },
        orderBy: { createdAt: "desc" },
        include: {
          appointment: true,
          patient: true,
        },
      });
      res.json(
        rows.map((r) => ({
          id: r.id,
          status: r.status,
          amountCents: r.amountCents,
          createdAt: r.createdAt,
          verifiedAt: r.verifiedAt,
          appointment: {
            id: r.appointmentId,
            startAt: r.appointment.startAt,
            endAt: r.appointment.endAt,
            status: r.appointment.status,
          },
          patient: {
            id: r.patientId,
            firstName: r.patient.firstName,
            lastName: r.patient.lastName,
          },
          proofDownloadUrl: `/api/payments/appointment-payments/${r.id}/proof`,
        })),
      );
    } catch (e) {
      next(e);
    }
  },
);

paymentsRouter.get(
  "/appointment-payments/:id/proof",
  requireAuth,
  async (req: AuthedRequest, res, next) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const row = await prisma.appointmentPayment.findUnique({
        where: { id },
        include: {
          patient: true,
          dentist: true,
        },
      });
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      const isPatientOwner = req.role === Role.PATIENT && patient?.id === row.patientId;
      const isDentistOwner = req.role === Role.DENTIST && dentist?.id === row.dentistId;
      const isAdmin = req.role === Role.ADMIN;
      if (!isPatientOwner && !isDentistOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (row.proofBlob) {
        res.setHeader("Content-Type", row.proofMimeType);
        res.setHeader("Content-Disposition", `inline; filename="${row.proofOriginalName}"`);
        res.send(Buffer.from(row.proofBlob));
        return;
      }
      if (row.proofStoragePath) {
        res.download(row.proofStoragePath, row.proofOriginalName);
        return;
      }
      res.status(500).json({ error: "Proof data missing" });
    } catch (e) {
      next(e);
    }
  },
);

const verifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
});

paymentsRouter.patch(
  "/dentists/me/appointment-payments/:id",
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
      const body = verifySchema.parse(req.body);
      const existing = await prisma.appointmentPayment.findUnique({ where: { id } });
      if (!existing || existing.dentistId !== dentist.id) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const updated = await prisma.appointmentPayment.update({
        where: { id },
        data: {
          status: body.status === "VERIFIED" ? PaymentVerificationStatus.VERIFIED : PaymentVerificationStatus.REJECTED,
          verifiedAt: new Date(),
          verifiedById: req.userId!,
        },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

