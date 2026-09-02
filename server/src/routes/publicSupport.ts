import { Router } from "express";
import { config } from "../lib/config.js";
import { getClinicContactInfo } from "../lib/clinicSettings.js";
import { prisma } from "../lib/prisma.js";

export const publicSupportRouter = Router();

publicSupportRouter.get("/", async (_req, res, next) => {
  try {
    const [dentist, contact] = await Promise.all([
      prisma.dentist.findFirst({
        select: {
          displayName: true,
          clinicAddress: true,
          user: { select: { email: true } },
        },
        orderBy: { id: "asc" },
      }),
      getClinicContactInfo(),
    ]);

    res.json({
      supportPhone: contact.supportPhone,
      clinicPhone: contact.clinicPhone,
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
