import { Router } from "express";
import { z } from "zod";
import { PaymentProvider } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const publicPaymentMethodsRouter = Router();

publicPaymentMethodsRouter.get("/dentists/:id/gcash", async (req, res, next) => {
  try {
    const dentistId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    z.string().min(1).parse(dentistId);

    const row = await prisma.dentistPaymentMethod.findUnique({
      where: { dentistId_provider: { dentistId, provider: PaymentProvider.GCASH } },
      select: {
        provider: true,
        phoneNumber: true,
        originalName: true,
        updatedAt: true,
      },
    });
    if (!row) {
      res.status(404).json({ error: "No GCash method uploaded" });
      return;
    }
    res.json({
      provider: row.provider,
      phoneNumber: row.phoneNumber,
      originalName: row.originalName,
      updatedAt: row.updatedAt,
      qrUrl: `/api/payments/dentists/${dentistId}/gcash-qr`,
    });
  } catch (e) {
    next(e);
  }
});

