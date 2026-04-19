import { Router } from "express";
import { z } from "zod";
import { Prisma, Role, ToothSurfaceStateKind } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const patientsRouter = Router();

const updateSelfSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
});

patientsRouter.get("/me", requireAuth, requireRole(Role.PATIENT), async (req: AuthedRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.userId! },
      include: { user: { select: { email: true, role: true } } },
    });
    if (!patient) {
      res.status(404).json({ error: "Patient profile not found" });
      return;
    }
    res.json(patient);
  } catch (e) {
    next(e);
  }
});

patientsRouter.patch("/me", requireAuth, requireRole(Role.PATIENT), async (req: AuthedRequest, res, next) => {
  try {
    const body = updateSelfSchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    if (!patient) {
      res.status(404).json({ error: "Patient profile not found" });
      return;
    }
    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: body,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

patientsRouter.get(
  "/",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (_req: AuthedRequest, res, next) => {
    try {
      const list = await prisma.patient.findMany({
        include: { user: { select: { email: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  },
);

function patientIdParam(req: AuthedRequest): string {
  return typeof req.params.id === "string" ? req.params.id : req.params.id[0];
}

const dossierPatchSchema = z.object({
  address: z.string().optional().nullable(),
  referredBy: z.string().optional().nullable(),
  physicianName: z.string().optional().nullable(),
  physicianAddress: z.string().optional().nullable(),
  physicianPhone: z.string().optional().nullable(),
  dentalReport: z
    .object({
      presentOralComplaint: z.string().optional().nullable(),
      familyHistory: z.string().optional().nullable(),
      remarks: z.string().optional().nullable(),
      medicalHistory: z.record(z.unknown()).optional().nullable(),
      clinicalExamination: z.record(z.unknown()).optional().nullable(),
    })
    .optional(),
});

patientsRouter.get(
  "/:id/dossier",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = patientIdParam(req);
      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          user: { select: { email: true } },
          dentalReport: true,
          appointments: {
            orderBy: { startAt: "desc" },
            include: {
              dentist: { include: { user: { select: { email: true } } } },
            },
          },
          consultations: {
            orderBy: { createdAt: "desc" },
            take: 30,
            include: {
              notes: { orderBy: { createdAt: "desc" } },
              dentist: { include: { user: { select: { email: true } } } },
            },
          },
          toothRecords: {
            orderBy: { recordedAt: "desc" },
            take: 500,
          },
        },
      });
      if (!patient) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      let age: number | null = null;
      if (patient.dateOfBirth) {
        const d = new Date(patient.dateOfBirth);
        const diff = Date.now() - d.getTime();
        age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      }
      res.json({ ...patient, age });
    } catch (e) {
      next(e);
    }
  },
);

patientsRouter.patch(
  "/:id/dossier",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const id = patientIdParam(req);
      const body = dossierPatchSchema.parse(req.body);
      const exists = await prisma.patient.findUnique({ where: { id } });
      if (!exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const { dentalReport, ...patientFields } = body;
      await prisma.$transaction(async (tx) => {
        const hasPatient =
          body.address !== undefined ||
          body.referredBy !== undefined ||
          body.physicianName !== undefined ||
          body.physicianAddress !== undefined ||
          body.physicianPhone !== undefined;
        if (hasPatient) {
          await tx.patient.update({
            where: { id },
            data: {
              ...(body.address !== undefined && { address: body.address }),
              ...(body.referredBy !== undefined && { referredBy: body.referredBy }),
              ...(body.physicianName !== undefined && { physicianName: body.physicianName }),
              ...(body.physicianAddress !== undefined && { physicianAddress: body.physicianAddress }),
              ...(body.physicianPhone !== undefined && { physicianPhone: body.physicianPhone }),
            },
          });
        }
        if (dentalReport) {
          await tx.patientDentalReport.upsert({
            where: { patientId: id },
            create: {
              patientId: id,
              presentOralComplaint: dentalReport.presentOralComplaint ?? null,
              familyHistory: dentalReport.familyHistory ?? null,
              remarks: dentalReport.remarks ?? null,
              medicalHistory:
                dentalReport.medicalHistory === undefined
                  ? undefined
                  : dentalReport.medicalHistory === null
                    ? Prisma.JsonNull
                    : (dentalReport.medicalHistory as Prisma.InputJsonValue),
              clinicalExamination:
                dentalReport.clinicalExamination === undefined
                  ? undefined
                  : dentalReport.clinicalExamination === null
                    ? Prisma.JsonNull
                    : (dentalReport.clinicalExamination as Prisma.InputJsonValue),
              updatedById: req.userId!,
            },
            update: {
              ...(dentalReport.presentOralComplaint !== undefined && {
                presentOralComplaint: dentalReport.presentOralComplaint,
              }),
              ...(dentalReport.familyHistory !== undefined && { familyHistory: dentalReport.familyHistory }),
              ...(dentalReport.remarks !== undefined && { remarks: dentalReport.remarks }),
              ...(dentalReport.medicalHistory !== undefined && {
                medicalHistory:
                  dentalReport.medicalHistory === null
                    ? Prisma.JsonNull
                    : (dentalReport.medicalHistory as Prisma.InputJsonValue),
              }),
              ...(dentalReport.clinicalExamination !== undefined && {
                clinicalExamination:
                  dentalReport.clinicalExamination === null
                    ? Prisma.JsonNull
                    : (dentalReport.clinicalExamination as Prisma.InputJsonValue),
              }),
              updatedById: req.userId!,
            },
          });
        }
      });
      const fresh = await prisma.patient.findUnique({
        where: { id },
        include: {
          user: { select: { email: true } },
          dentalReport: true,
          appointments: {
            orderBy: { startAt: "desc" },
            include: {
              dentist: { include: { user: { select: { email: true } } } },
            },
          },
          consultations: {
            orderBy: { createdAt: "desc" },
            take: 30,
            include: {
              notes: { orderBy: { createdAt: "desc" } },
              dentist: { include: { user: { select: { email: true } } } },
            },
          },
          toothRecords: {
            orderBy: { recordedAt: "desc" },
            take: 500,
          },
        },
      });
      let age: number | null = null;
      if (fresh?.dateOfBirth) {
        const d = new Date(fresh.dateOfBirth);
        age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
      res.json({ ...fresh!, age });
    } catch (e) {
      next(e);
    }
  },
);

async function canViewPatient(req: AuthedRequest, patientId: string): Promise<boolean> {
  if (req.role === Role.ADMIN || req.role === Role.DENTIST) return true;
  if (req.role === Role.PATIENT) {
    const p = await prisma.patient.findUnique({ where: { userId: req.userId! } });
    return p?.id === patientId;
  }
  return false;
}

const toothSurfaceKey = z.string().regex(/^\d{2}-[OBLMD]$/);
const toothSurfacePutSchema = z.record(toothSurfaceKey, z.nativeEnum(ToothSurfaceStateKind));

patientsRouter.get(
  "/:id/tooth-surfaces",
  requireAuth,
  async (req: AuthedRequest, res, next) => {
    try {
      const pid = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      if (!(await canViewPatient(req, pid))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const rows = await prisma.toothSurfaceState.findMany({ where: { patientId: pid } });
      const out: Record<string, ToothSurfaceStateKind> = {};
      for (const r of rows) {
        out[`${r.toothFdi}-${r.surface}`] = r.state;
      }
      res.json(out);
    } catch (e) {
      next(e);
    }
  },
);

patientsRouter.put(
  "/:id/tooth-surfaces",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const pid = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const body = toothSurfacePutSchema.parse(req.body);
      const exists = await prisma.patient.findUnique({ where: { id: pid } });
      if (!exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      await prisma.$transaction(async (tx) => {
        for (const [key, state] of Object.entries(body)) {
          const [toothFdi, surface] = key.split("-") as [string, string];
          if (state === ToothSurfaceStateKind.NONE) {
            await tx.toothSurfaceState.deleteMany({
              where: { patientId: pid, toothFdi, surface },
            });
          } else {
            await tx.toothSurfaceState.upsert({
              where: {
                patientId_toothFdi_surface: { patientId: pid, toothFdi, surface },
              },
              create: {
                patientId: pid,
                toothFdi,
                surface,
                state,
                updatedById: req.userId!,
              },
              update: { state, updatedById: req.userId! },
            });
          }
        }
      });
      const rows = await prisma.toothSurfaceState.findMany({ where: { patientId: pid } });
      const out: Record<string, ToothSurfaceStateKind> = {};
      for (const r of rows) {
        out[`${r.toothFdi}-${r.surface}`] = r.state;
      }
      res.json(out);
    } catch (e) {
      next(e);
    }
  },
);

patientsRouter.get(
  "/:id",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: typeof req.params.id === "string" ? req.params.id : req.params.id[0] },
        include: { user: { select: { email: true } } },
      });
      if (!patient) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(patient);
    } catch (e) {
      next(e);
    }
  },
);
