import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.nativeEnum(Role),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    licenseNumber: z.string().optional(),
    specialty: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === Role.ADMIN) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cannot self-register as admin" });
    }
    if (data.role === Role.PATIENT && (!data.firstName || !data.lastName)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Patients require firstName and lastName" });
    }
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

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

const registerPatientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

authRouter.post(
  "/register/patient",
  upload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const parsed = registerPatientSchema.parse(req.body);
      const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (exists) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }

      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const front = files?.idFront?.[0];
      const back = files?.idBack?.[0];

      const passwordHash = await bcrypt.hash(parsed.password, 12);
      const user = await prisma.user.create({
        data: {
          email: parsed.email,
          passwordHash,
          role: Role.PATIENT,
          patient: {
            create: {
              firstName: parsed.firstName,
              lastName: parsed.lastName,
              idDocument: {
                create: {
                  ...(front && {
                    frontBlob: toBytes(front.buffer),
                    frontMimeType: front.mimetype,
                    frontOriginalName: front.originalname,
                  }),
                  ...(back && {
                    backBlob: toBytes(back.buffer),
                    backMimeType: back.mimetype,
                    backOriginalName: back.originalname,
                  }),
                },
              },
            },
          },
        },
        include: {
          patient: true,
          dentist: true,
        },
      });

      const token = signToken({ sub: user.id, role: user.role });
      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          patient: user.patient,
          dentist: user.dentist,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (exists) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        role: parsed.role,
        ...(parsed.role === Role.PATIENT && {
          patient: {
            create: {
              firstName: parsed.firstName!,
              lastName: parsed.lastName!,
              phone: parsed.phone,
            },
          },
        }),
        ...(parsed.role === Role.DENTIST && {
          dentist: {
            create: {
              licenseNumber: parsed.licenseNumber,
              specialty: parsed.specialty,
            },
          },
        }),
      },
      include: {
        patient: true,
        dentist: true,
      },
    });
    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        patient: user.patient,
        dentist: user.dentist,
      },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      include: { patient: true, dentist: true },
    });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const ok = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = signToken({ sub: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        patient: user.patient,
        dentist: user.dentist,
      },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { patient: true, dentist: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      patient: user.patient,
      dentist: user.dentist,
    });
  } catch (e) {
    next(e);
  }
});
