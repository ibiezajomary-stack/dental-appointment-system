import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Dialog, DialogContent, DialogTitle, Paper, Typography } from "@mui/material";
import { Odontogram, type ToothConditionGroup, type ToothDetail } from "react-odontogram";
import "react-odontogram/style.css";
import {
  PRIMARY_CHART_MAX_AGE,
  type DentitionChartMode,
  chartModeForAge,
  fdiToLibraryToothId,
  isPermanentFdi,
  isPrimaryFdi,
  librarySelectionToFdi,
  librarySlotToDisplayFdiLabel,
} from "./dentition";
import { PerToothOcclusalGrid } from "./PerToothOcclusalGrid";
import { SchematicFiveSurface } from "./SchematicFiveSurface";
import { api } from "../../lib/api";
import type { SurfaceCode, SurfaceState } from "./surfaceChart";
import { SURFACE_CODES, SURFACE_LABELS, surfaceFill, surfaceStroke } from "./surfaceChart";

type SurfaceMap = Record<string, SurfaceState>;

function buildPerTooth(map: SurfaceMap): Record<string, Partial<Record<SurfaceCode, SurfaceState>>> {
  const out: Record<string, Partial<Record<SurfaceCode, SurfaceState>>> = {};
  for (const [k, v] of Object.entries(map)) {
    const [fdi, surf] = k.split("-") as [string, SurfaceCode];
    if (!fdi || !surf) continue;
    if (!out[fdi]) out[fdi] = {};
    out[fdi][surf] = v;
  }
  return out;
}

const PRIORITY: Record<SurfaceState, number> = {
  NONE: 0,
  WATCH: 1,
  FILLED: 2,
  CARIES: 3,
  CROWN: 4,
  MISSING: 5,
};

function dominantState(surfaces: Partial<Record<SurfaceCode, SurfaceState>>): SurfaceState {
  let best: SurfaceState = "NONE";
  let p = -1;
  for (const code of SURFACE_CODES) {
    const s = surfaces[code] ?? "NONE";
    const pr = PRIORITY[s];
    if (pr > p) {
      p = pr;
      best = s;
    }
  }
  return best;
}

const CONDITION_LABEL: Record<Exclude<SurfaceState, "NONE">, string> = {
  MISSING: "Missing",
  CROWN: "Crown",
  CARIES: "Caries",
  FILLED: "Filled / restored",
  WATCH: "Watch",
};

function surfaceMapToTeethConditions(
  perTooth: Record<string, Partial<Record<SurfaceCode, SurfaceState>>>,
  mode: DentitionChartMode,
): ToothConditionGroup[] {
  const fdis = Object.keys(perTooth).filter((fdi) =>
    mode === "primary" ? isPrimaryFdi(fdi) : isPermanentFdi(fdi),
  );
  const order: Exclude<SurfaceState, "NONE">[] = ["MISSING", "CROWN", "CARIES", "FILLED", "WATCH"];
  const groups: ToothConditionGroup[] = [];
  for (const state of order) {
    const teeth: string[] = [];
    for (const fdi of fdis) {
      if (dominantState(perTooth[fdi] ?? {}) === state) {
        teeth.push(fdiToLibraryToothId(fdi, mode));
      }
    }
    if (teeth.length > 0) {
      groups.push({
        label: CONDITION_LABEL[state],
        teeth,
        fillColor: surfaceFill(state),
        outlineColor: surfaceStroke(state),
      });
    }
  }
  return groups;
}

type Props = {
  patientId: string;
  readOnly?: boolean;
  /** Full years — primary (deciduous) chart if ≤12, permanent if ≥13. Unknown → permanent + notice. */
  ageYears?: number | null;
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** `react-odontogram` does not paint FDI digits on teeth; inject centered labels from each `g.teeth-{fdi}` group. */
function removeInjectedFdiLabels(root: HTMLElement) {
  root.querySelectorAll("text[data-fdi-chart-label]").forEach((n) => n.remove());
}

function injectFdiLabels(root: HTMLElement, mode: DentitionChartMode) {
  root.querySelectorAll<SVGGElement>("g[class*='teeth-']").forEach((g) => {
    const toothClass = [...g.classList].find((c) => c.startsWith("teeth-"));
    if (!toothClass) return;
    const fdi = toothClass.replace(/^teeth-/, "");
    if (!/^\d{2}$/.test(fdi)) return;
    if (g.querySelector("text[data-fdi-chart-label]")) return;

    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("data-fdi-chart-label", "1");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
    text.setAttribute("font-weight", "700");
    text.setAttribute("fill", "#0d47a1");
    text.setAttribute("stroke", "#ffffff");
    text.setAttribute("stroke-width", "0.45");
    text.setAttribute("paint-order", "stroke fill");
    text.setAttribute("pointer-events", "none");
    text.textContent = librarySlotToDisplayFdiLabel(toothClass, mode);

    try {
      const b = g.getBBox();
      if (b.width <= 0 || b.height <= 0) return;
      const fs = Math.max(6, Math.min(12, Math.min(b.width, b.height) * 0.34));
      text.setAttribute("font-size", String(fs));
      text.setAttribute("x", String(b.x + b.width / 2));
      text.setAttribute("y", String(b.y + b.height / 2));
    } catch {
      return;
    }
    g.appendChild(text);
  });
}

export function PaperStyleOdontogram({ patientId, readOnly, ageYears }: Props) {
  const [map, setMap] = useState<SurfaceMap>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailFdi, setDetailFdi] = useState<string | null>(null);
  const chartRegionRef = useRef<HTMLDivElement>(null);

  const chartMode = useMemo(() => chartModeForAge(ageYears), [ageYears]);
  const maxTeeth = chartMode === "primary" ? 5 : 8;
  /** Explicit `null` from parent = date of birth missing; `undefined` = omit age hint (compat). */
  const ageUnknown = ageYears === null;

  const tooltipConfig = useMemo(
    () => ({
      placement: "top" as const,
      margin: 10,
      content: (payload?: ToothDetail) => {
        if (!payload) return null;
        const fdi = librarySelectionToFdi(payload.id, chartMode);
        return (
          <div style={{ minWidth: 130 }}>
            <strong>Tooth {fdi}</strong>
            <div>{payload.type}</div>
          </div>
        );
      },
    }),
    [chartMode],
  );

  const load = useCallback(async () => {
    if (!patientId) return;
    setError(null);
    try {
      const data = await api<SurfaceMap>(`/api/patients/${encodeURIComponent(patientId)}/tooth-surfaces`);
      setMap(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chart");
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const perTooth = useMemo(() => buildPerTooth(map), [map]);

  const teethConditions = useMemo(
    () => surfaceMapToTeethConditions(perTooth, chartMode),
    [perTooth, chartMode],
  );

  const persist = useCallback(
    async (key: string, state: SurfaceState) => {
      if (!patientId || readOnly) return;
      setSaving(true);
      setError(null);
      try {
        const next = await api<SurfaceMap>(`/api/patients/${encodeURIComponent(patientId)}/tooth-surfaces`, {
          method: "PUT",
          body: JSON.stringify({ [key]: state }),
        });
        setMap(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
        await load();
      } finally {
        setSaving(false);
      }
    },
    [patientId, readOnly, load],
  );

  const onOdontogramChange = useCallback(
    (selected: ToothDetail[]) => {
      if (readOnly) return;
      const first = selected[0];
      setDetailFdi(first ? librarySelectionToFdi(first.id, chartMode) : null);
    },
    [readOnly, chartMode],
  );

  useLayoutEffect(() => {
    const root = chartRegionRef.current;
    if (!root) return;

    const paint = () => {
      removeInjectedFdiLabels(root);
      injectFdiLabels(root, chartMode);
    };

    paint();
    const id = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(id);
      removeInjectedFdiLabels(root);
    };
  }, [patientId, map, teethConditions, chartMode]);

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: "#fffef5", border: "1px solid", borderColor: "warning.light" }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {chartMode === "primary"
          ? `Primary (deciduous) teeth chart for patients age ${PRIMARY_CHART_MAX_AGE} or younger. `
          : `Permanent teeth chart for patients age ${PRIMARY_CHART_MAX_AGE + 1} or older. `}
        {readOnly
          ? "Chart colors show the strongest recorded finding per tooth (from surface data). See legend below."
          : "Click a tooth to chart surfaces (occlusal, buccal, lingual, mesial, distal). Selection opens the surface schematic."}
      </Typography>
      {ageUnknown && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Date of birth is not set — showing the permanent chart. Add date of birth to the patient profile
          to select the primary vs permanent chart automatically.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {saving && (
        <Typography variant="caption" color="primary">
          Saving…
        </Typography>
      )}

      <Box
        ref={chartRegionRef}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 2, md: 3 },
          alignItems: "start",
          width: "100%",
          maxWidth: { xs: "100%", md: 1488 },
          mx: "auto",
          py: 0.5,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
            Circular arch
          </Typography>
          <Box
            sx={{
              overflow: "hidden",
              "& .Odontogram": { width: "100%" },
              "& .Odontogram svg": {
                width: "100% !important",
                height: "auto !important",
                maxHeight: { xs: 288, sm: 348, md: 408 },
              },
            }}
          >
            <Odontogram
              key={`${patientId}-circle-${chartMode}`}
              notation="FDI"
              readOnly={readOnly}
              singleSelect={!readOnly}
              onChange={onOdontogramChange}
              teethConditions={teethConditions.length > 0 ? teethConditions : undefined}
              showLabels={false}
              showTooltip
              tooltip={tooltipConfig}
              maxTeeth={maxTeeth}
              layout="circle"
              styles={{ width: "100%", maxWidth: "100%" }}
            />
          </Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
            Square layout (quadrants)
          </Typography>
          <Box
            sx={{
              overflow: "auto",
              "& .Odontogram": { width: "100%" },
              "& .Odontogram svg": {
                width: "100% !important",
                height: "auto !important",
                /* 2× tooth/visual size vs circular chart */
                maxHeight: { xs: 576, sm: 696, md: 816 },
              },
              "& ul[aria-label='Tooth condition legend']": {
                fontSize: 12,
                gap: "6px !important",
                justifyContent: "center",
              },
            }}
          >
            <Odontogram
              key={`${patientId}-square-${chartMode}`}
              notation="FDI"
              readOnly={readOnly}
              singleSelect={!readOnly}
              onChange={onOdontogramChange}
              teethConditions={teethConditions.length > 0 ? teethConditions : undefined}
              showLabels={teethConditions.length > 0}
              showTooltip
              tooltip={tooltipConfig}
              maxTeeth={maxTeeth}
              layout="square"
              styles={{ width: "100%", maxWidth: "100%" }}
            />
          </Box>
          <PerToothOcclusalGrid
            dentition={chartMode}
            perTooth={perTooth}
            onToothClick={readOnly ? undefined : (fdi) => setDetailFdi(fdi)}
          />
        </Box>
      </Box>

      <Box mt={2} display="flex" flexWrap="wrap" gap={2}>
        <Typography variant="caption" color="text.secondary">
          Surfaces: {Object.entries(SURFACE_LABELS)
            .map(([k, v]) => `${k}=${v}`)
            .join(" · ")}
        </Typography>
      </Box>

      <Dialog open={Boolean(detailFdi)} onClose={() => setDetailFdi(null)} maxWidth="sm" fullWidth>
        {detailFdi && (
          <>
            <DialogTitle>Tooth {detailFdi} — surfaces</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set each surface with the dropdowns; the diagram updates to match.
              </Typography>
              <SchematicFiveSurface
                toothFdi={detailFdi}
                surfaces={perTooth[detailFdi] ?? {}}
                readOnly={readOnly}
                onChange={(key, next) => {
                  void persist(key, next);
                }}
                size={140}
              />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Paper>
  );
}
