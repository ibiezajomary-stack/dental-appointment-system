import { Router } from "express";
import { z } from "zod";
import { BillingStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const billingRouter = Router();

const createSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  amountCents: z.number().int().positive(),
  description: z.string().optional(),
  status: z.nativeEnum(BillingStatus).optional(),
});

billingRouter.post(
  "/",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const row = await prisma.billingRecord.create({
        data: {
          patientId: body.patientId,
          appointmentId: body.appointmentId,
          amountCents: body.amountCents,
          description: body.description,
          status: body.status ?? BillingStatus.PENDING,
        },
      });
      res.status(201).json(row);
    } catch (e) {
      next(e);
    }
  },
);

billingRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.role === Role.PATIENT) {
      const p = await prisma.patient.findUnique({ where: { userId: req.userId! } });
      if (!p) {
        res.status(400).json({ error: "No patient profile" });
        return;
      }
      const rows = await prisma.billingRecord.findMany({
        where: { patientId: p.id },
        orderBy: { createdAt: "desc" },
      });
      res.json(rows);
      return;
    }
    const rows = await prisma.billingRecord.findMany({
      orderBy: { createdAt: "desc" },
      include: { patient: true, appointment: true },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Sales Report endpoints (for dentist manual payment recording)
const createSalesReportSchema = z.object({
  amountCents: z.coerce.number().int().positive(),
  paymentDate: z.string().trim().min(1),
  description: z.string().optional(),
});

billingRouter.post(
  "/sales-reports",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const body = createSalesReportSchema.parse(req.body);
      const row = await prisma.salesReport.create({
        data: {
          dentistId: dentist.id,
          amountCents: body.amountCents,
          paymentDate: new Date(body.paymentDate),
          description: body.description,
        },
      });
      res.status(201).json(row);
    } catch (e) {
      next(e);
    }
  },
);

billingRouter.get(
  "/sales-reports",
  requireAuth,
  requireRole(Role.DENTIST),
  async (req: AuthedRequest, res, next) => {
    try {
      const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
      if (!dentist) {
        res.status(404).json({ error: "Dentist profile not found" });
        return;
      }
      const rows = await prisma.salesReport.findMany({
        where: { dentistId: dentist.id },
        orderBy: { paymentDate: "desc" },
      });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  },
);

billingRouter.delete(
  "/sales-reports/:id",
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
      const record = await prisma.salesReport.findUnique({ where: { id } });
      if (!record) {
        res.status(404).json({ error: "Sales report not found" });
        return;
      }
      if (record.dentistId !== dentist.id) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      await prisma.salesReport.delete({ where: { id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);
