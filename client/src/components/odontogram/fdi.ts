/** Permanent teeth FDI — screen order: patient upper arch */
export const FDI_UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
export const FDI_UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
export const FDI_LOWER_LEFT = ["38", "37", "36", "35", "34", "33", "32", "31"];
export const FDI_LOWER_RIGHT = ["41", "42", "43", "44", "45", "46", "47", "48"];

/** Primary (deciduous) */
export const PRI_UPPER_R = ["55", "54", "53", "52", "51"];
export const PRI_UPPER_L = ["61", "62", "63", "64", "65"];
export const PRI_LOWER_L = ["85", "84", "83", "82", "81"];
export const PRI_LOWER_R = ["71", "72", "73", "74", "75"];

export type ToothVariant = "incisor" | "canine" | "premolar" | "molar";

/** Crown shape from FDI (permanent quadrants 1–4, primary 5–8). */
export function getToothVariant(fdi: string): ToothVariant {
  const q = parseInt(fdi[0] ?? "0", 10);
  const idx = parseInt(fdi.slice(1), 10);
  const primary = q >= 5 && q <= 8;
  if (primary) {
    if (idx <= 2) return "incisor";
    if (idx === 3) return "canine";
    if (idx === 4) return "premolar";
    return "molar";
  }
  if (idx <= 2) return "incisor";
  if (idx === 3) return "canine";
  if (idx <= 5) return "premolar";
  return "molar";
}
