import { prisma } from "./prisma.js";

const CLINIC_SETTINGS_ID = "default";

export type ClinicContactInfo = {
  clinicPhone: string | null;
  supportPhone: string | null;
};

export async function getClinicContactInfo(): Promise<ClinicContactInfo> {
  const row = await prisma.clinicSettings.findUnique({
    where: { id: CLINIC_SETTINGS_ID },
  });

  return {
    clinicPhone: row?.clinicPhone?.trim() || null,
    supportPhone: row?.supportPhone?.trim() || null,
  };
}

export async function ensureClinicSettingsRow(): Promise<void> {
  await prisma.clinicSettings.upsert({
    where: { id: CLINIC_SETTINGS_ID },
    update: {},
    create: { id: CLINIC_SETTINGS_ID },
  });
}
