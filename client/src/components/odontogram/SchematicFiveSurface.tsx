import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { OcclusalFiveSurfaceSvg } from "./OcclusalFiveSurfaceSvg";
import type { SurfaceCode, SurfaceState } from "./surfaceChart";
import {
  SURFACE_CODES,
  SURFACE_LABELS,
  SURFACE_STATE_LABELS,
  SURFACE_STATE_ORDER,
} from "./surfaceChart";

type Props = {
  toothFdi: string;
  /** Map O,B,L,M,D -> state */
  surfaces: Partial<Record<SurfaceCode, SurfaceState>>;
  readOnly?: boolean;
  onChange: (key: string, next: SurfaceState) => void;
  size?: number;
};

/**
 * Classic 5-surface occlusal schematic (visual) plus one dropdown per surface for state.
 */
export function SchematicFiveSurface({
  toothFdi,
  surfaces,
  readOnly,
  onChange,
  size = 40,
}: Props) {
  const get = (code: SurfaceCode): SurfaceState => surfaces[code] ?? "NONE";

  return (
    <Box sx={{ width: "100%" }} aria-label={`Tooth ${toothFdi} surface chart`} component="section">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
        <Box sx={{ flexShrink: 0, alignSelf: { xs: "center", sm: "flex-start" } }}>
          <OcclusalFiveSurfaceSvg toothFdi={toothFdi} surfaces={surfaces} size={size} showFdiLabel />
        </Box>

        <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {SURFACE_CODES.map((code) => {
            const labelId = `surface-${toothFdi}-${code}`;
            return (
              <FormControl key={code} size="small" fullWidth disabled={readOnly}>
                <InputLabel id={labelId}>{`${code}: ${SURFACE_LABELS[code]}`}</InputLabel>
                <Select
                  labelId={labelId}
                  label={`${code}: ${SURFACE_LABELS[code]}`}
                  value={get(code)}
                  onChange={(e) => {
                    onChange(`${toothFdi}-${code}`, e.target.value as SurfaceState);
                  }}
                >
                  {SURFACE_STATE_ORDER.map((state) => (
                    <MenuItem key={state} value={state}>
                      {SURFACE_STATE_LABELS[state]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
