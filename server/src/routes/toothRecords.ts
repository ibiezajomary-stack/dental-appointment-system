import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

export const toothRecordsRouter = Router();

const createSchema = z.object({
  toothFdi: z.string().min(1).max(3),
  condition: z.string().optional(),
  procedure: z.string().optional(),
});

async function canAccessPatient(req: AuthedRequest, patientId: string): Promise<boolean> {
  if (req.role === Role.ADMIN) return true;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return false;
  if (req.role === Role.PATIENT && patient.userId === req.userId) return true;
  if (req.role === Role.DENTIST) {
    const d = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
    return !!d;
  }
  return false;
}

toothRecordsRouter.get("/patients/:patientId/teeth", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const patientId =
      typeof req.params.patientId === "string"
        ? req.params.patientId
        : req.params.patientId[0];
    if (!(await canAccessPatient(req, patientId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await prisma.toothRecord.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

toothRecordsRouter.post("/patients/:patientId/teeth", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const patientId =
      typeof req.params.patientId === "string"
        ? req.params.patientId
        : req.params.patientId[0];
    const body = createSchema.parse(req.body);
    if (req.role !== Role.DENTIST && req.role !== Role.ADMIN) {
      res.status(403).json({ error: "Only staff can add tooth records" });
      return;
    }
    if (!(await canAccessPatient(req, patientId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const row = await prisma.toothRecord.create({
      data: {
        patientId,
        toothFdi: body.toothFdi,
        condition: body.condition,
        procedure: body.procedure,
        recordedById: req.userId!,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});
