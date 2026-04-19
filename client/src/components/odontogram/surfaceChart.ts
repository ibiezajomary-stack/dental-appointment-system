/** Matches server `ToothSurfaceStateKind` */
export type SurfaceState =
  | "NONE"
  | "CARIES"
  | "FILLED"
  | "CROWN"
  | "MISSING"
  | "WATCH";

export const SURFACE_CODES = ["O", "B", "L", "M", "D"] as const;
export type SurfaceCode = (typeof SURFACE_CODES)[number];

export const SURFACE_LABELS: Record<SurfaceCode, string> = {
  O: "Occlusal / incisal",
  B: "Buccal",
  L: "Lingual",
  M: "Mesial",
  D: "Distal",
};

/** Order used in dropdowns and any legacy cycle logic. */
export const SURFACE_STATE_ORDER: SurfaceState[] = [
  "NONE",
  "CARIES",
  "FILLED",
  "CROWN",
  "WATCH",
  "MISSING",
];

export const SURFACE_STATE_LABELS: Record<SurfaceState, string> = {
  NONE: "Sound (none)",
  CARIES: "Caries",
  FILLED: "Filled / restored",
  CROWN: "Crown",
  WATCH: "Watch",
  MISSING: "Missing",
};

/** One-way cycle; after MISSING returns to NONE. */
export function nextSurfaceState(current: SurfaceState): SurfaceState {
  const i = SURFACE_STATE_ORDER.indexOf(current);
  const idx = i === -1 ? 0 : i;
  return SURFACE_STATE_ORDER[(idx + 1) % SURFACE_STATE_ORDER.length];
}

export function surfaceFill(state: SurfaceState): string {
  switch (state) {
    case "CARIES":
      return "#3e2723";
    case "FILLED":
      return "#1565c0";
    case "CROWN":
      return "#f9a825";
    case "MISSING":
      return "#9e9e9e";
    case "WATCH":
      return "#ff9800";
    case "NONE":
    default:
      return "#ffffff";
  }
}

export function surfaceStroke(state: SurfaceState): string {
  if (state === "NONE") return "#546e7a";
  return "#263238";
}
