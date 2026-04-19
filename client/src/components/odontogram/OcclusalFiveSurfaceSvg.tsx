import type { SurfaceCode, SurfaceState } from "./surfaceChart";
import { surfaceFill, surfaceStroke } from "./surfaceChart";

type Props = {
  toothFdi: string;
  surfaces: Partial<Record<SurfaceCode, SurfaceState>>;
  size?: number;
  /** Show FDI in the center of the occlusal diagram (off for tiny thumbnails). */
  showFdiLabel?: boolean;
};

/**
 * Five-surface occlusal (top) view — colors reflect charted surface states.
 */
export function OcclusalFiveSurfaceSvg({
  toothFdi,
  surfaces,
  size = 40,
  showFdiLabel = true,
}: Props) {
  const vb = size;
  const s = size / 44;
  const O = 16 * s;
  const Os = 12 * s;

  const get = (code: SurfaceCode): SurfaceState => surfaces[code] ?? "NONE";

  return (
    <svg
      width={vb}
      height={vb}
      viewBox={`0 0 ${vb} ${vb}`}
      style={{ display: "block" }}
      aria-label={`Occlusal view tooth ${toothFdi}`}
    >
      <polygon
        points={`${O},${2 * s} ${O + Os},${2 * s} ${O + Os},${O} ${O},${O}`}
        fill={surfaceFill(get("B"))}
        stroke={surfaceStroke(get("B"))}
        strokeWidth={0.8 * s}
        style={{ pointerEvents: "none" }}
      />
      <polygon
        points={`${O},${O + Os} ${O + Os},${O + Os} ${O + Os},${vb - 2 * s} ${O},${vb - 2 * s}`}
        fill={surfaceFill(get("L"))}
        stroke={surfaceStroke(get("L"))}
        strokeWidth={0.8 * s}
        style={{ pointerEvents: "none" }}
      />
      <polygon
        points={`${2 * s},${O} ${O},${O} ${O},${O + Os} ${2 * s},${O + Os}`}
        fill={surfaceFill(get("M"))}
        stroke={surfaceStroke(get("M"))}
        strokeWidth={0.8 * s}
        style={{ pointerEvents: "none" }}
      />
      <polygon
        points={`${O + Os},${O} ${vb - 2 * s},${O} ${vb - 2 * s},${O + Os} ${O + Os},${O + Os}`}
        fill={surfaceFill(get("D"))}
        stroke={surfaceStroke(get("D"))}
        strokeWidth={0.8 * s}
        style={{ pointerEvents: "none" }}
      />
      <rect
        x={O}
        y={O}
        width={Os}
        height={Os}
        fill={surfaceFill(get("O"))}
        stroke={surfaceStroke(get("O"))}
        strokeWidth={1.2 * s}
        style={{ pointerEvents: "none" }}
      />
      {showFdiLabel && (
        <text
          x={O + Os / 2}
          y={O + Os / 2 + 3 * s}
          textAnchor="middle"
          fontSize={8 * s}
          fill="#263238"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {toothFdi}
        </text>
      )}
    </svg>
  );
}
