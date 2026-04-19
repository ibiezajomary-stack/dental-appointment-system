import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  FDI_LOWER_LEFT,
  FDI_LOWER_RIGHT,
  FDI_UPPER_LEFT,
  FDI_UPPER_RIGHT,
  PRI_LOWER_L,
  PRI_LOWER_R,
  PRI_UPPER_L,
  PRI_UPPER_R,
} from "./fdi";
import type { DentitionChartMode } from "./dentition";
import { isPermanentFdi, isPrimaryFdi } from "./dentition";
import { OcclusalFiveSurfaceSvg } from "./OcclusalFiveSurfaceSvg";
import type { SurfaceCode, SurfaceState } from "./surfaceChart";
import { SURFACE_CODES } from "./surfaceChart";

const PERMANENT_ORDER = [...FDI_UPPER_RIGHT, ...FDI_UPPER_LEFT, ...FDI_LOWER_LEFT, ...FDI_LOWER_RIGHT];
const PRIMARY_ORDER = [...PRI_UPPER_R, ...PRI_UPPER_L, ...PRI_LOWER_L, ...PRI_LOWER_R];

function hasAnySurfaceFinding(surfaces: Partial<Record<SurfaceCode, SurfaceState>> | undefined): boolean {
  if (!surfaces) return false;
  return SURFACE_CODES.some((c) => (surfaces[c] ?? "NONE") !== "NONE");
}

type Props = {
  /** Matches arch shown on the main odontogram (primary vs permanent). */
  dentition: DentitionChartMode;
  perTooth: Record<string, Partial<Record<SurfaceCode, SurfaceState>>>;
  onToothClick?: (fdi: string) => void;
};

function ToothCell({
  fdi,
  surfaces,
  onClick,
}: {
  fdi: string;
  surfaces: Partial<Record<SurfaceCode, SurfaceState>>;
  onClick?: (fdi: string) => void;
}) {
  const hasFinding = hasAnySurfaceFinding(surfaces);
  const clickable = Boolean(onClick);

  return (
    <Box
      component={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={clickable ? () => onClick?.(fdi) : undefined}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.25,
        p: 0.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: hasFinding ? "primary.light" : "divider",
        bgcolor: hasFinding ? "action.hover" : "background.paper",
        cursor: clickable ? "pointer" : "default",
        transition: "background-color 120ms, border-color 120ms",
        "&:hover": clickable
          ? {
              bgcolor: "action.selected",
              borderColor: "primary.main",
            }
          : undefined,
        font: "inherit",
        color: "inherit",
        textAlign: "center",
      }}
    >
      <Typography variant="caption" fontWeight={700} color={hasFinding ? "primary.dark" : "text.secondary"}>
        {fdi}
      </Typography>
      <OcclusalFiveSurfaceSvg toothFdi={fdi} surfaces={surfaces} size={48} showFdiLabel={false} />
    </Box>
  );
}

export function PerToothOcclusalGrid({ dentition, perTooth, onToothClick }: Props) {
  const permanentListed = useMemo(
    () =>
      PERMANENT_ORDER.filter(
        (fdi) => isPermanentFdi(fdi) && hasAnySurfaceFinding(perTooth[fdi]),
      ),
    [perTooth],
  );
  const primaryListed = useMemo(
    () =>
      PRIMARY_ORDER.filter((fdi) => isPrimaryFdi(fdi) && hasAnySurfaceFinding(perTooth[fdi])),
    [perTooth],
  );
  const primaryMode = dentition === "primary";
  const listed = primaryMode ? primaryListed : permanentListed;
  const anyListed = listed.length > 0;

  return (
    <Box sx={{ pt: 2, borderTop: "1px dashed", borderColor: "divider" }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
        Occlusal (top) view — {primaryMode ? "primary (deciduous) teeth" : "permanent teeth"}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, maxWidth: 560 }}>
        Only teeth with at least one charted finding are shown (sound teeth are omitted). Colors match surface
        states.
        {onToothClick ? " Click a tile to open surface details for that tooth." : ""}
      </Typography>

      {!anyListed && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No charted findings yet — occlusal thumbnails appear here when any surface is recorded.
        </Typography>
      )}

      {anyListed && (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {primaryMode ? `Primary (${listed.length})` : `Permanent (${listed.length})`}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
              gap: 1,
            }}
          >
            {listed.map((fdi) => (
              <ToothCell
                key={fdi}
                fdi={fdi}
                surfaces={perTooth[fdi] ?? {}}
                onClick={onToothClick}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
