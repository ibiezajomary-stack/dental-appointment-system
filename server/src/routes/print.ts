import { Router } from "express";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const printRouter = Router();

function patientIdParam(req: AuthedRequest): string {
  return typeof req.params.patientId === "string" ? req.params.patientId : req.params.patientId[0];
}

async function canPrintPatient(req: AuthedRequest, patientId: string): Promise<boolean> {
  if (req.role === Role.ADMIN) return true;
  if (req.role === Role.DENTIST) {
    const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
    if (!dentist) return false;
    const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    return Boolean(p);
  }
  return false;
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

async function makePdf(title: string, sections: { heading: string; body: string }[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  const { width, height } = page.getSize();
  let y = height - 48;
  const left = 48;
  const right = width - 48;
  const maxWidth = right - left;

  page.drawText(title, { x: left, y, size: 16, font: fontBold, color: rgb(0.05, 0.2, 0.18) });
  y -= 26;

  const stamp = new Date().toLocaleString();
  page.drawText(`Generated: ${stamp}`, { x: left, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 18;

  const charsPerLine = Math.floor(maxWidth / 6.2);

  for (const sec of sections) {
    if (y < 96) {
      page = pdf.addPage([612, 792]);
      y = page.getSize().height - 48;
    }
    page.drawText(sec.heading, { x: left, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;

    const body = sec.body.trim() || "—";
    for (const line of wrapLines(body, charsPerLine)) {
      if (y < 72) {
        page = pdf.addPage([612, 792]);
        y = page.getSize().height - 48;
      }
      page.drawText(line, { x: left, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 12;
    }
    y -= 10;
  }

  return pdf.save();
}

printRouter.get(
  "/patients/:patientId/prescription",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = patientIdParam(req);
      if (!(await canPrintPatient(req, patientId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          user: { select: { email: true } },
          dentalReport: true,
        },
      });
      if (!patient) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const dentist = await prisma.dentist.findFirst({
        include: { user: { select: { email: true } } },
      });

      const latestNote = await prisma.consultationNote.findFirst({
        where: { consultation: { patientId } },
        orderBy: { createdAt: "desc" },
        include: { consultation: true },
      });

      const sections: { heading: string; body: string }[] = [
        { heading: "Patient", body: `${patient.firstName} ${patient.lastName}\nEmail: ${patient.user.email}` },
        {
          heading: "Prescribing dentist",
          body: `${dentist?.displayName ?? "Dentist"}\nEmail: ${dentist?.user.email ?? "—"}`,
        },
      ];

      if (latestNote) {
        sections.push(
          { heading: "Diagnosis", body: latestNote.diagnosis ?? "" },
          { heading: "Prescribed medication", body: latestNote.prescribedMedication ?? "" },
          { heading: "Notes", body: latestNote.notes ?? "" },
          { heading: "Treatment plan", body: latestNote.treatmentPlan ?? "" },
        );
      } else {
        sections.push({
          heading: "Prescription",
          body: "No consultation notes were found yet for this patient.",
        });
      }

      const pdfBytes = await makePdf("Prescription", sections);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="prescription-${patientId}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (e) {
      next(e);
    }
  },
);

printRouter.get(
  "/patients/:patientId/dental-certificate",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = patientIdParam(req);
      if (!(await canPrintPatient(req, patientId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const q = z
        .object({
          purpose: z.string().optional(),
          clearance: z.string().optional(),
        })
        .parse(req.query);

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { user: { select: { email: true } } },
      });
      if (!patient) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const dentist = await prisma.dentist.findFirst({
        include: { user: { select: { email: true } } },
      });

      const pdfBytes = await makePdf("Dental certificate", [
        { heading: "Patient", body: `${patient.firstName} ${patient.lastName}` },
        {
          heading: "Attending dentist",
          body: `${dentist?.displayName ?? "Dentist"}\nEmail: ${dentist?.user.email ?? "—"}`,
        },
        { heading: "Purpose", body: q.purpose ?? "General dental clearance / certification" },
        { heading: "Clinical clearance / remarks", body: q.clearance ?? "Fit for intended purpose based on available records." },
      ]);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="dental-certificate-${patientId}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (e) {
      next(e);
    }
  },
);

printRouter.get(
  "/patients/:patientId/history",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = patientIdParam(req);
      if (!(await canPrintPatient(req, patientId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          user: { select: { email: true } },
          dentalReport: true,
          appointments: { orderBy: { startAt: "desc" }, take: 25, select: { startAt: true, status: true, notes: true } },
          consultations: {
            orderBy: { createdAt: "desc" },
            take: 15,
            select: { createdAt: true, status: true, notes: { orderBy: { createdAt: "desc" }, take: 1 } },
          },
          toothRecords: { orderBy: { recordedAt: "desc" }, take: 25 },
        },
      });
      if (!patient) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const appts = patient.appointments
        .map((a) => `${a.startAt.toISOString()} — ${a.status}\n${(a.notes ?? "").trim()}`)
        .join("\n\n");

      const consults = patient.consultations
        .map((c) => {
          const n = c.notes[0];
          return `${c.createdAt.toISOString()} — ${c.status}\n${n?.diagnosis ?? ""}\n${n?.notes ?? ""}`;
        })
        .join("\n\n");

      const teeth = patient.toothRecords
        .map((t) => `${t.recordedAt.toISOString()} — FDI ${t.toothFdi}: ${t.condition ?? ""} / ${t.procedure ?? ""}`)
        .join("\n");

      const pdfBytes = await makePdf("Patient history (summary)", [
        { heading: "Patient", body: `${patient.firstName} ${patient.lastName}\nEmail: ${patient.user.email}` },
        {
          heading: "Dental report (high level)",
          body: [
            patient.dentalReport?.presentOralComplaint ? `Complaint: ${patient.dentalReport.presentOralComplaint}` : "",
            patient.dentalReport?.familyHistory ? `Family history: ${patient.dentalReport.familyHistory}` : "",
            patient.dentalReport?.remarks ? `Remarks: ${patient.dentalReport.remarks}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        { heading: "Recent appointments", body: appts || "—" },
        { heading: "Recent consultations", body: consults || "—" },
        { heading: "Recent tooth records", body: teeth || "—" },
      ]);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="patient-history-${patientId}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (e) {
      next(e);
    }
  },
);
