import { Router } from "express";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";

export const publicSupportRouter = Router();

publicSupportRouter.get("/", async (_req, res, next) => {
  try {
    const dentist = await prisma.dentist.findFirst({
      select: {
        phone: true,
        displayName: true,
        clinicAddress: true,
        user: { select: { email: true } },
      },
      orderBy: { id: "asc" },
    });

    const clinicPhone =
      dentist?.phone?.trim() || process.env.CLINIC_PHONE?.trim() || config.supportPhone;

    res.json({
      supportPhone: config.supportPhone,
      clinicPhone,
      clinicEmail: dentist?.user.email ?? null,
      supportHours: config.supportHours,
      clinicName: config.clinicName,
      clinicAddress: dentist?.clinicAddress?.trim() ?? null,
      dentistName: dentist?.displayName ?? null,
    });
  } catch (e) {
    next(e);
  }
});
