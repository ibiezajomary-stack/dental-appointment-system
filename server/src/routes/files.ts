import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

export const filesRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      await fs.mkdir(config.uploadDir, { recursive: true });
      cb(null, config.uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$|^application\/pdf$/.test(file.mimetype);
    if (!ok) {
      cb(new Error("Only images (JPEG, PNG, GIF, WebP) or PDF allowed"));
      return;
    }
    cb(null, true);
  },
});

const metaSchema = z.object({
  patientId: z.string(),
  consultationId: z.string().optional(),
});

filesRouter.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "file field required" });
        return;
      }
      const meta = metaSchema.parse({
        patientId: req.body.patientId,
        consultationId: req.body.consultationId || undefined,
      });
      const patient = await prisma.patient.findUnique({ where: { id: meta.patientId } });
      if (!patient) {
        await fs.unlink(req.file.path).catch(() => {});
        res.status(404).json({ error: "Patient not found" });
        return;
      }
      const isPatient = req.role === Role.PATIENT && patient.userId === req.userId;
      const isStaff = req.role === Role.DENTIST || req.role === Role.ADMIN;
      if (!isPatient && !isStaff) {
        await fs.unlink(req.file.path).catch(() => {});
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const row = await prisma.storedFile.create({
        data: {
          patientId: meta.patientId,
          consultationId: meta.consultationId,
          storagePath: req.file.path,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          sizeBytes: req.file.size,
          uploadedById: req.userId!,
        },
      });
      res.status(201).json({
        id: row.id,
        originalName: row.originalName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt,
      });
    } catch (e) {
      next(e);
    }
  },
);

filesRouter.get("/:id/download", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const fileId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const row = await prisma.storedFile.findUnique({
      where: { id: fileId },
      include: { patient: true },
    });
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const isOwner = req.role === Role.PATIENT && row.patient.userId === req.userId;
    const isStaff = req.role === Role.DENTIST || req.role === Role.ADMIN;
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.download(row.storagePath, row.originalName);
  } catch (e) {
    next(e);
  }
});

filesRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const patientId = z.string().optional().parse(req.query.patientId);
    if (req.role === Role.PATIENT) {
      const p = await prisma.patient.findUnique({ where: { userId: req.userId! } });
      if (!p) {
        res.status(400).json({ error: "No patient profile" });
        return;
      }
      const files = await prisma.storedFile.findMany({
        where: { patientId: p.id },
        orderBy: { createdAt: "desc" },
      });
      res.json(files);
      return;
    }
    if (patientId) {
      const files = await prisma.storedFile.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      });
      res.json(files);
      return;
    }
    if (req.role === Role.ADMIN) {
      const files = await prisma.storedFile.findMany({ orderBy: { createdAt: "desc" } });
      res.json(files);
      return;
    }
    res.status(400).json({ error: "patientId query required for staff" });
  } catch (e) {
    next(e);
  }
});
