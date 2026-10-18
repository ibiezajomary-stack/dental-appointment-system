import { Router, type Response } from "express";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
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
        include: { user: { select: { email: true } }, signature: true },
      })
    : latestNote
      ? await prisma.dentist.findUnique({
          where: { id: latestNote.consultation.dentistId },
          include: { user: { select: { email: true } }, signature: true },
        })
      : await prisma.dentist.findFirst({ include: { user: { select: { email: true } }, signature: true } });

  const pdfBytes = await makePrescriptionPdf({
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientAddress: patient.address ?? "",
    patientAge: ageFromDob(patient.dateOfBirth),
    patientGender: patient.sex ?? "",
    prescribedDate: latestNote?.createdAt ?? new Date(),
    medication: latestNote?.prescribedMedication ?? "",
    notes: [latestNote?.diagnosis, latestNote?.notes].filter((part) => part?.trim()).join("\n"),
    treatmentPlan: latestNote?.treatmentPlan ?? "",
    dentistName: dentist?.displayName ?? "Dentist",
    licenseNumber: dentist?.licenseNumber ?? "",
    signature: dentist?.signature ?? null,
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
        include: { user: { select: { email: true } }, signature: true },
      })
    : await prisma.dentist.findFirst({ include: { user: { select: { email: true } }, signature: true } });

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
    signature: dentist?.signature ?? null,
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
  return d.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

type SignatureFile = { blob: Uint8Array; mimeType: string };

function formatDentistName(name: string): string {
  const trimmed = name.trim() || "DENTIST";
  const upper = trimmed.toUpperCase();
  return upper.startsWith("DR.") || upper.startsWith("DR ") ? upper : `DR. ${upper}`;
}

function medicationItems(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : ["No medications prescribed."];
}

async function embedSignatureImage(
  pdf: PDFDocument,
  signature: SignatureFile | null | undefined,
): Promise<PDFImage | null> {
  if (!signature?.blob?.byteLength) return null;
  const mime = signature.mimeType.toLowerCase();
  try {
    if (mime.includes("png")) return await pdf.embedPng(signature.blob);
    if (mime.includes("jpeg") || mime.includes("jpg")) return await pdf.embedJpg(signature.blob);
  } catch (err) {
    console.warn("[print] Could not embed dentist signature", err);
  }
  return null;
}

function drawSignatureImage(
  page: ReturnType<Awaited<ReturnType<typeof PDFDocument.create>>["addPage"]>,
  image: PDFImage | null,
  rightX: number,
  bottomY: number,
): void {
  if (!image) return;
  const maxW = 150;
  const maxH = 64;
  let width = maxW;
  let height = (image.height / image.width) * width;
  if (height > maxH) {
    height = maxH;
    width = (image.width / image.height) * height;
  }
  page.drawImage(image, { x: rightX - width, y: bottomY, width, height });
}

async function makePrescriptionPdf(params: {
  patientName: string;
  patientAddress: string;
  patientAge: string;
  patientGender: string;
  prescribedDate: Date;
  medication: string;
  notes: string;
  treatmentPlan: string;
  dentistName: string;
  licenseNumber: string;
  signature: SignatureFile | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signature = await embedSignatureImage(pdf, params.signature);
  const page = pdf.addPage([612, 792]);
  const { width, height } = page.getSize();
  const left = 54;
  const right = width - 54;
  const bodyWidth = right - left;
  let y = height - 56;

  const headerRows: [string, string][] = [
    ["Name:", params.patientName || "N/A"],
    ["Date:", formatDate(params.prescribedDate)],
    ["Address:", params.patientAddress || "N/A"],
    ["Age/Gender:", `${params.patientAge} / ${params.patientGender || "N/A"}`],
  ];
  for (const [label, value] of headerRows) {
    drawTextSafe(page, label, left, y, fontBold, 11);
    const labelWidth = textWidth(label, fontBold, 11);
    const valueLines = wrapLinesToWidth(value, bodyWidth - labelWidth - 10, font, 11);
    for (const line of valueLines) {
      drawTextSafe(page, line, left + labelWidth + 8, y, font, 11);
      y -= 16;
    }
  }

  y -= 18;
  drawTextSafe(page, "Rx", left, y - 6, fontBold, 42);
  y -= 56;

  const sections: { label: string; body: string }[] = [
    { label: "Medication:", body: medicationItems(params.medication).map((item) => `- ${item}`).join("\n") },
    { label: "Notes/Diagnosis:", body: params.notes.trim() || "—" },
    { label: "Treatment Plan/Duration:", body: params.treatmentPlan.trim() || "—" },
  ];

  const footerLineY = 188;
  for (const section of sections) {
    if (y < footerLineY + 36) break;
    drawTextSafe(page, section.label, left, y, fontBold, 12);
    y -= 18;
    const lines = section.body.split("\n").flatMap((paragraph) => wrapLinesToWidth(paragraph, bodyWidth, font, 11));
    for (const line of lines) {
      if (y < footerLineY + 20) break;
      drawTextSafe(page, line, left, y, font, 11);
      y -= 16;
    }
    y -= 10;
  }

  page.drawLine({
    start: { x: left, y: footerLineY },
    end: { x: right, y: footerLineY },
    thickness: 0.8,
    color: rgb(0.35, 0.35, 0.35),
  });
  drawSignatureImage(page, signature, right, 118);
  const dentistLine = formatDentistName(params.dentistName);
  drawRightAligned(page, dentistLine, right, 96, fontBold, 11);
  drawRightAligned(page, `Lic. No.: ${params.licenseNumber || "N/A"}`, right, 78, font, 11);

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
  signature: SignatureFile | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signature = await embedSignatureImage(pdf, params.signature);
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

  const footerTop = 250;
  for (const line of wrapLinesToWidth(paragraph1, bodyWidth, font, bodySize)) {
    if (y < footerTop) break;
    drawTextSafe(page, line, margin, y, font, bodySize);
    y -= lineHeight;
  }

  y -= 12;

  for (const line of wrapLinesToWidth(paragraph2, bodyWidth, font, bodySize)) {
    if (y < footerTop) break;
    drawTextSafe(page, line, margin, y, font, bodySize);
    y -= lineHeight;
  }

  // Signature image sits directly above the dentist name, license, and clinic lines.
  const dentistLine = formatDentistName(params.dentistName);
  const specialization = [params.dentistTitle || "Dentist", params.facilityName].filter(Boolean).join(" / ");
  const footerLines: { text: string; bold: boolean }[] = [
    { text: dentistLine, bold: true },
    { text: specialization, bold: false },
    { text: `Lic. # ${params.licenseNumber || "N/A"}`, bold: false },
  ];
  let footerY = 150;
  drawSignatureImage(page, signature, right, footerY + 18);
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

  const stamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
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
