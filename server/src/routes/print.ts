import { Router, type Response } from "express";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { IssuedDocumentType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const printRouter = Router();

const certificatePayloadSchema = z.object({
  treatmentDetails: z.string().min(1),
  restDays: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  requesterName: z.string().min(1),
});

type CertificatePayload = z.infer<typeof certificatePayloadSchema>;

function patientIdParam(req: AuthedRequest): string {
  return typeof req.params.patientId === "string" ? req.params.patientId : req.params.patientId[0];
}

async function getOwnPatientId(userId: string | undefined): Promise<string | null> {
  if (!userId) return null;
  const p = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
  return p?.id ?? null;
}

async function canPrintPatient(req: AuthedRequest, patientId: string): Promise<boolean> {
  if (req.role === Role.ADMIN) return true;
  if (req.role === Role.PATIENT) {
    const ownId = await getOwnPatientId(req.userId!);
    return ownId === patientId;
  }
  if (req.role === Role.DENTIST) {
    const dentist = await prisma.dentist.findUnique({ where: { userId: req.userId! } });
    if (!dentist) return false;
    const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    return Boolean(p);
  }
  return false;
}

async function resolveDentistForPrint(req: AuthedRequest, issuedDentistId?: string) {
  if (req.role === Role.DENTIST) {
    return prisma.dentist.findUnique({
      where: { userId: req.userId! },
      include: { user: { select: { email: true } } },
    });
  }
  if (issuedDentistId) {
    return prisma.dentist.findUnique({
      where: { id: issuedDentistId },
      include: { user: { select: { email: true } } },
    });
  }
  return prisma.dentist.findFirst({
    include: { user: { select: { email: true } } },
  });
}

async function getLatestCertificatePayload(patientId: string): Promise<CertificatePayload | null> {
  const doc = await prisma.issuedDocument.findFirst({
    where: { patientId, type: IssuedDocumentType.DENTAL_CERTIFICATE },
    orderBy: { createdAt: "desc" },
  });
  if (!doc) return null;
  return certificatePayloadSchema.parse(doc.payload);
}

async function buildPrescriptionPdf(patientId: string, dentistIdHint?: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return null;

  const latestNote = await prisma.consultationNote.findFirst({
    where: { consultation: { patientId } },
    orderBy: { createdAt: "desc" },
    include: { consultation: { select: { dentistId: true } } },
  });

  const dentist = dentistIdHint
    ? await prisma.dentist.findUnique({
        where: { id: dentistIdHint },
        include: { user: { select: { email: true } } },
      })
    : latestNote
      ? await prisma.dentist.findUnique({
          where: { id: latestNote.consultation.dentistId },
          include: { user: { select: { email: true } } },
        })
      : await prisma.dentist.findFirst({ include: { user: { select: { email: true } } } });

  const medications = [
    latestNote?.prescribedMedication,
    latestNote?.notes ? `Notes: ${latestNote.notes}` : null,
    latestNote?.treatmentPlan ? `Treatment plan: ${latestNote.treatmentPlan}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const pdfBytes = await makePrescriptionPdf({
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientAddress: patient.address ?? "",
    patientAge: ageFromDob(patient.dateOfBirth),
    patientGender: patient.sex ?? "",
    prescribedDate: latestNote?.createdAt ?? new Date(),
    medications: medications || "No medications prescribed.",
    dentistName: dentist?.displayName ?? "Dentist",
    licenseNumber: dentist?.licenseNumber ?? "",
  });

  return { pdfBytes, patient, hasNote: Boolean(latestNote?.prescribedMedication?.trim()) };
}

async function buildCertificatePdf(
  patientId: string,
  payload: CertificatePayload,
  dentistIdHint?: string,
  issueDate?: Date,
) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return null;

  const dentist = dentistIdHint
    ? await prisma.dentist.findUnique({
        where: { id: dentistIdHint },
        include: { user: { select: { email: true } } },
      })
    : await prisma.dentist.findFirst({ include: { user: { select: { email: true } } } });

  const patientFullName = `${patient.firstName} ${patient.lastName}`;
  const pdfBytes = await makeDentalCertificatePdf({
    issueDate: issueDate ?? new Date(),
    patientName: patientFullName,
    patientAge: ageFromDob(patient.dateOfBirth),
    patientAddress: patient.address ?? "",
    treatmentDetails: payload.treatmentDetails,
    restDays: payload.restDays,
    startDate: payload.startDate,
    endDate: payload.endDate,
    requesterName: payload.requesterName,
    dentistName: dentist?.displayName ?? "Dentist",
    dentistTitle: dentist?.specialty ?? "Dentist",
    facilityName: config.clinicName,
    licenseNumber: dentist?.licenseNumber ?? "",
  });

  return pdfBytes;
}

function sendPdf(res: Response, filename: string, pdfBytes: Uint8Array) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.send(Buffer.from(pdfBytes));
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = sanitizePdfText(text).replace(/\s+/g, " ").trim().split(" ");
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

function wrapLinesToWidth(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  size: number,
): string[] {
  const words = sanitizePdfText(text).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function ageFromDob(dob: Date | null | undefined): string {
  if (!dob) return "N/A";
  const years = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return String(years);
}

/** Standard PDF fonts only support WinAnsi — strip/replace unsupported characters. */
function sanitizePdfText(text: string): string {
  return text
    .replace(/\u211e/g, "Rx")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, "");
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function formatCertDate(s: string): string {
  if (!s?.trim()) return "N/A";
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  if (Number.isNaN(d.getTime())) return s;
  return formatDate(d);
}

function drawWrapped(
  page: ReturnType<Awaited<ReturnType<typeof PDFDocument.create>>["addPage"]>,
  text: string,
  x: number,
  yStart: number,
  maxChars: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  size: number,
  lineHeight = 16,
): number {
  let y = yStart;
  for (const line of wrapLines(text, maxChars)) {
    page.drawText(sanitizePdfText(line), { x, y, size, font });
    y -= lineHeight;
  }
  return y;
}

function textWidth(
  text: string,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  size: number,
): number {
  return font.widthOfTextAtSize(sanitizePdfText(text), size);
}

function drawTextSafe(
  page: ReturnType<Awaited<ReturnType<typeof PDFDocument.create>>["addPage"]>,
  text: string,
  x: number,
  y: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  size: number,
) {
  page.drawText(sanitizePdfText(text), { x, y, size, font });
}

function drawRightAligned(
  page: ReturnType<Awaited<ReturnType<typeof PDFDocument.create>>["addPage"]>,
  text: string,
  rightX: number,
  y: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  size: number,
) {
  const safe = sanitizePdfText(text);
  const w = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - w, y, size, font });
}

async function makePrescriptionPdf(params: {
  patientName: string;
  patientAddress: string;
  patientAge: string;
  patientGender: string;
  prescribedDate: Date;
  medications: string;
  dentistName: string;
  licenseNumber: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const { width, height } = page.getSize();
  const left = 48;
  const right = width - 48;
  let y = height - 56;

  // Header block
  drawTextSafe(page, `Name: ${params.patientName}`, left, y, font, 11);
  y -= 16;
  drawTextSafe(page, `Date: ${formatDate(params.prescribedDate)}`, left, y, font, 11);
  y -= 16;
  drawTextSafe(page, `Address: ${params.patientAddress || "N/A"}`, left, y, font, 11);
  y -= 16;
  drawTextSafe(page, `Age/Gender: ${params.patientAge} / ${params.patientGender || "N/A"}`, left, y, font, 11);
  y -= 28;

  // Rx symbol (WinAnsi-safe)
  drawTextSafe(page, "Rx", left, y - 8, fontBold, 36);

  // Body — medications
  const bodyLeft = left + 64;
  const bodyWidth = right - bodyLeft;
  const charsPerLine = Math.floor(bodyWidth / 6);
  const medLines = wrapLines(params.medications || "No medications prescribed.", charsPerLine);
  let bodyY = y;
  for (const line of medLines) {
    drawTextSafe(page, line, bodyLeft, bodyY, font, 11);
    bodyY -= 14;
  }

  // Footer
  const footerY = 96;
  page.drawLine({ start: { x: left, y: footerY + 24 }, end: { x: right, y: footerY + 24 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  drawTextSafe(page, `Doctor Name: ${params.dentistName}`, left, footerY, fontBold, 11);
  drawTextSafe(page, `Lic. No.: ${params.licenseNumber || "N/A"}`, left, footerY - 16, font, 11);

  return pdf.save();
}

async function makeDentalCertificatePdf(params: {
  issueDate: Date;
  patientName: string;
  patientAge: string;
  patientAddress: string;
  treatmentDetails: string;
  restDays: string;
  startDate: string;
  endDate: string;
  requesterName: string;
  dentistName: string;
  dentistTitle: string;
  facilityName: string;
  licenseNumber: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 72;
  const right = width - margin;
  const bodySize = 11;
  const lineHeight = 22;
  let y = height - 80;

  const title = "DENTAL CERTIFICATE";
  const titleSize = 14;
  drawTextSafe(page, title, (width - textWidth(title, fontBold, titleSize)) / 2, y, fontBold, titleSize);
  y -= 34;

  drawRightAligned(page, `Date: ${formatDate(params.issueDate)}`, right, y, font, bodySize);
  y -= 40;

  drawTextSafe(page, "To Whom It May Concern:", margin, y, font, bodySize);
  y -= 32;

  const treatment = params.treatmentDetails.trim();
  const treatmentWithPeriod = treatment.endsWith(".") ? treatment : `${treatment}.`;
  const startLabel = formatCertDate(params.startDate);
  const endLabel = formatCertDate(params.endDate);
  const bodyWidth = right - margin;

  const paragraph1 =
    `This is to certify that ${params.patientName}, ${params.patientAge} of ${params.patientAddress || "N/A"} ` +
    `has undergone oral examination ${treatmentWithPeriod} ` +
    `This patient advice to rest for ${params.restDays} from ${startLabel} to ${endLabel}.`;

  const paragraph2 =
    `This certification is issued upon the request of Mr./Mrs. ${params.requesterName} ` +
    `for whatever purpose may serve him/her.`;

  for (const line of wrapLinesToWidth(paragraph1, bodyWidth, font, bodySize)) {
    drawTextSafe(page, line, margin, y, font, bodySize);
    y -= lineHeight;
  }

  y -= 12;

  for (const line of wrapLinesToWidth(paragraph2, bodyWidth, font, bodySize)) {
    drawTextSafe(page, line, margin, y, font, bodySize);
    y -= lineHeight;
  }

  // Signature block — bottom right, top-to-bottom order per paper form
  const dentistLine = params.dentistName.toUpperCase().startsWith("DR.")
    ? params.dentistName.toUpperCase()
    : `DR. ${params.dentistName.toUpperCase()}`;
  const footerLines: { text: string; bold: boolean }[] = [
    { text: dentistLine, bold: true },
    { text: params.dentistTitle || "Dentist", bold: false },
    { text: params.facilityName, bold: false },
    { text: `Lic. # ${params.licenseNumber || "N/A"}`, bold: false },
  ];
  let footerY = 150;
  for (const line of footerLines) {
    const f = line.bold ? fontBold : font;
    drawRightAligned(page, line.text, right, footerY, f, bodySize);
    footerY -= 16;
  }

  return pdf.save();
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
  "/me/documents-status",
  requireAuth,
  requireRole(Role.PATIENT),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = await getOwnPatientId(req.userId);
      if (!patientId) {
        res.status(401).json({ error: "Patient profile not found" });
        return;
      }

      const latestNote = await prisma.consultationNote.findFirst({
        where: {
          consultation: { patientId },
          prescribedMedication: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, prescribedMedication: true },
      });

      const latestCert = await prisma.issuedDocument.findFirst({
        where: { patientId, type: IssuedDocumentType.DENTAL_CERTIFICATE },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      res.json({
        hasPrescription: Boolean(latestNote?.prescribedMedication?.trim()),
        hasCertificate: Boolean(latestCert),
        prescriptionUpdatedAt: latestNote?.createdAt.toISOString() ?? null,
        certificateIssuedAt: latestCert?.createdAt.toISOString() ?? null,
      });
    } catch (e) {
      next(e);
    }
  },
);

printRouter.get(
  "/me/prescription",
  requireAuth,
  requireRole(Role.PATIENT),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = await getOwnPatientId(req.userId);
      if (!patientId) {
        res.status(401).json({ error: "Patient profile not found" });
        return;
      }
      const built = await buildPrescriptionPdf(patientId);
      if (!built) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (!built.hasNote) {
        res.status(404).json({ error: "No prescription has been issued yet" });
        return;
      }
      sendPdf(res, `prescription-${patientId}.pdf`, built.pdfBytes);
    } catch (e) {
      next(e);
    }
  },
);

printRouter.get(
  "/me/dental-certificate",
  requireAuth,
  requireRole(Role.PATIENT),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = await getOwnPatientId(req.userId);
      if (!patientId) {
        res.status(401).json({ error: "Patient profile not found" });
        return;
      }

      const issued = await prisma.issuedDocument.findFirst({
        where: { patientId, type: IssuedDocumentType.DENTAL_CERTIFICATE },
        orderBy: { createdAt: "desc" },
      });
      if (!issued) {
        res.status(404).json({ error: "No dental certificate has been issued yet" });
        return;
      }

      const parsed = certificatePayloadSchema.safeParse(issued.payload);
      if (!parsed.success) {
        res.status(500).json({ error: "Certificate record is invalid. Please ask your dentist to re-issue." });
        return;
      }

      const pdfBytes = await buildCertificatePdf(patientId, parsed.data, issued.dentistId, issued.createdAt);
      if (!pdfBytes) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      sendPdf(res, `dental-certificate-${patientId}.pdf`, pdfBytes);
    } catch (e) {
      next(e);
    }
  },
);

printRouter.get(
  "/patients/:patientId/prescription",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN, Role.PATIENT),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = patientIdParam(req);
      if (!(await canPrintPatient(req, patientId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const built = await buildPrescriptionPdf(patientId);
      if (!built) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      sendPdf(res, `prescription-${patientId}.pdf`, built.pdfBytes);
    } catch (e) {
      next(e);
    }
  },
);

printRouter.post(
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

      const body = certificatePayloadSchema.parse(req.body);
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const dentist = await resolveDentistForPrint(req);
      if (!dentist) {
        res.status(400).json({ error: "No dentist profile found" });
        return;
      }

      await prisma.issuedDocument.create({
        data: {
          patientId,
          dentistId: dentist.id,
          type: IssuedDocumentType.DENTAL_CERTIFICATE,
          payload: body,
        },
      });

      const pdfBytes = await buildCertificatePdf(patientId, body, dentist.id);
      if (!pdfBytes) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      sendPdf(res, `dental-certificate-${patientId}.pdf`, pdfBytes);
    } catch (e) {
      next(e);
    }
  },
);

printRouter.get(
  "/patients/:patientId/dental-certificate",
  requireAuth,
  requireRole(Role.DENTIST, Role.ADMIN, Role.PATIENT),
  async (req: AuthedRequest, res, next) => {
    try {
      const patientId = patientIdParam(req);
      if (!(await canPrintPatient(req, patientId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const q = z
        .object({
          treatmentDetails: z.string().optional(),
          restDays: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          requesterName: z.string().optional(),
        })
        .parse(req.query);

      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const issued = await prisma.issuedDocument.findFirst({
        where: { patientId, type: IssuedDocumentType.DENTAL_CERTIFICATE },
        orderBy: { createdAt: "desc" },
      });

      const today = formatDate(new Date());
      const patientFullName = `${patient.firstName} ${patient.lastName}`;

      let payload: CertificatePayload;
      let dentistIdHint: string | undefined;
      let issueDate: Date | undefined;

      if (issued && req.role === Role.PATIENT) {
        payload = certificatePayloadSchema.parse(issued.payload);
        dentistIdHint = issued.dentistId;
        issueDate = issued.createdAt;
      } else if (issued && !q.treatmentDetails) {
        payload = certificatePayloadSchema.parse(issued.payload);
        dentistIdHint = issued.dentistId;
        issueDate = issued.createdAt;
      } else {
        payload = {
          treatmentDetails: q.treatmentDetails ?? "and received appropriate dental care",
          restDays: q.restDays ?? "one (1) day",
          startDate: q.startDate ?? today,
          endDate: q.endDate ?? today,
          requesterName: q.requesterName ?? patientFullName,
        };
        const dentist = await resolveDentistForPrint(req, issued?.dentistId);
        dentistIdHint = dentist?.id;
      }

      const pdfBytes = await buildCertificatePdf(patientId, payload, dentistIdHint, issueDate);
      if (!pdfBytes) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      sendPdf(res, `dental-certificate-${patientId}.pdf`, pdfBytes);
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
