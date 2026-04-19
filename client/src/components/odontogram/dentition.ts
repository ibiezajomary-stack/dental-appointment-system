/** Last age (in full years) that uses the primary (deciduous) chart; 13+ uses permanent. */
export const PRIMARY_CHART_MAX_AGE = 12;

export type DentitionChartMode = "primary" | "permanent";

export function chartModeForAge(ageYears: number | null | undefined): DentitionChartMode {
  if (ageYears == null || Number.isNaN(ageYears)) return "permanent";
  return ageYears <= PRIMARY_CHART_MAX_AGE ? "primary" : "permanent";
}

/** Match server `/api/patients` age calculation. */
export function ageFromDateOfBirth(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export function isPrimaryFdi(fdi: string): boolean {
  const q = parseInt(fdi[0] ?? "", 10);
  return q >= 5 && q <= 8;
}

export function isPermanentFdi(fdi: string): boolean {
  const q = parseInt(fdi[0] ?? "", 10);
  return q >= 1 && q <= 4;
}

/** Map primary FDI (51–55, …) to `react-odontogram` element ids (teeth-11–teeth-15, …). */
export function primaryFdiToLibraryToothId(fdi: string): string {
  const q = parseInt(fdi[0] ?? "0", 10);
  if (q >= 5 && q <= 8) {
    const pos = fdi[1] ?? "";
    return `teeth-${q - 4}${pos}`;
  }
  return `teeth-${fdi}`;
}

/** Inverse: library id teeth-11 → FDI 51 (primary chart only). */
export function libraryToothIdToPrimaryFdi(id: string): string {
  const n = id.replace(/^teeth-/, "");
  if (!/^\d{2}$/.test(n)) return n;
  const libQ = parseInt(n[0] ?? "0", 10);
  const pos = n[1] ?? "";
  if (libQ >= 1 && libQ <= 4) {
    return `${libQ + 4}${pos}`;
  }
  return n;
}

export function fdiToLibraryToothId(fdi: string, mode: DentitionChartMode): string {
  if (mode === "primary" && isPrimaryFdi(fdi)) return primaryFdiToLibraryToothId(fdi);
  return `teeth-${fdi}`;
}

/** Selection callback: real FDI for API / dialog. */
export function librarySelectionToFdi(toothId: string, mode: DentitionChartMode): string {
  if (mode === "primary") return libraryToothIdToPrimaryFdi(toothId);
  return toothId.replace(/^teeth-/, "");
}

/** Label painted on each tooth (library uses permanent-slot ids in both modes). */
export function librarySlotToDisplayFdiLabel(libraryId: string, mode: DentitionChartMode): string {
  const raw = libraryId.replace(/^teeth-/, "");
  if (mode === "primary") return libraryToothIdToPrimaryFdi(libraryId);
  return raw;
}
