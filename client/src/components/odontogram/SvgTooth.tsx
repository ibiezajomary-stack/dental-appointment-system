import { useState } from "react";
import type { ToothVariant } from "./fdi";

type Props = {
  fdi: string;
  x: number;
  y: number;
  width: number;
  height: number;
  variant: ToothVariant;
  hasRecord: boolean;
  selected?: boolean;
  readOnly?: boolean;
  onClick?: (fdi: string) => void;
  labelScale?: number;
};

function Crown({
  variant,
  w,
  h,
  fill,
  stroke,
  strokeWidth,
}: {
  variant: ToothVariant;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  const common = { fill, stroke, strokeWidth, strokeLinejoin: "round" as const };
  switch (variant) {
    case "incisor":
      return (
        <rect
          x={w * 0.12}
          y={h * 0.08}
          width={w * 0.76}
          height={h * 0.84}
          rx={w * 0.22}
          ry={h * 0.14}
          {...common}
        />
      );
    case "canine":
      return (
        <path
          d={`M ${w * 0.5} ${h * 0.05} L ${w * 0.92} ${h * 0.35} L ${w * 0.85} ${h * 0.95} L ${w * 0.15} ${h * 0.95} L ${w * 0.08} ${h * 0.35} Z`}
          {...common}
        />
      );
    case "premolar":
      return (
        <ellipse cx={w / 2} cy={h / 2} rx={w * 0.42} ry={h * 0.4} {...common} />
      );
    case "molar":
      return (
        <path
          d={`M ${w * 0.08} ${h * 0.25}
              Q ${w / 2} ${h * 0.02} ${w * 0.92} ${h * 0.25}
              L ${w * 0.88} ${h * 0.78}
              Q ${w / 2} ${h * 0.98} ${w * 0.12} ${h * 0.78}
              Z`}
          {...common}
        />
      );
    default:
      return <rect x={0} y={0} width={w} height={h} rx={4} {...common} />;
  }
}

export function SvgTooth({
  fdi,
  x,
  y,
  width: w,
  height: h,
  variant,
  hasRecord,
  selected,
  readOnly,
  onClick,
  labelScale = 1,
}: Props) {
  const [hover, setHover] = useState(false);
  const fill = hasRecord ? "#1565c0" : hover && !readOnly ? "#e3f2fd" : "#fafafa";
  const stroke = selected ? "#f57c00" : hover && !readOnly ? "#0d47a1" : "#546e7a";
  const sw = selected ? 3.2 : hover && !readOnly ? 2.5 : 2;
  const fs = Math.round(11 * labelScale);
  const labelFill = hasRecord ? "#ffffff" : "#37474f";

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: readOnly ? "default" : "pointer" }}
      onClick={() => !readOnly && onClick?.(fdi)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(fdi);
        }
      }}
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
    >
      <Crown variant={variant} w={w} h={h} fill={fill} stroke={stroke} strokeWidth={sw} />
      <text
        x={w / 2}
        y={h / 2 + fs * 0.35}
        textAnchor="middle"
        fontSize={fs}
        fontWeight={600}
        fill={labelFill}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {fdi}
      </text>
    </g>
  );
}
