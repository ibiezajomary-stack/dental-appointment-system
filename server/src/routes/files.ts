import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

export const filesRouter = Router();

function toBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Uint8Array<ArrayBuffer>(ab);
}

const upload = multer({
  storage: multer.memoryStorage(),
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
        res.status(404).json({ error: "Patient not found" });
        return;
      }
      const isPatient = req.role === Role.PATIENT && patient.userId === req.userId;
      const isStaff = req.role === Role.DENTIST || req.role === Role.ADMIN;
      if (!isPatient && !isStaff) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const row = await prisma.storedFile.create({
        data: {
          patientId: meta.patientId,
          consultationId: meta.consultationId,
          blob: toBytes(req.file.buffer),
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          sizeBytes: req.file.buffer.length,
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
    if (row.blob) {
      res.setHeader("Content-Type", row.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${row.originalName}"`);
      res.send(Buffer.from(row.blob));
      return;
    }
    if (row.storagePath) {
      res.download(row.storagePath, row.originalName);
      return;
    }
    res.status(500).json({ error: "File data missing" });
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
