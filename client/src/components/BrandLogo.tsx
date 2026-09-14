import { Box, Typography } from "@mui/material";
import { useId } from "react";

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  to?: string;
};

export function ToothMark({ size = 40 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `ismile-tooth-${uid}`;
  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      sx={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4db6ac" />
          <stop offset="100%" stopColor="#00796b" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="#e0f2f1" />
      <path
        d="M24 9c5.8 0 10.5 4 10.5 9.5 0 2.3-.6 4.4-1.4 6.7-.8 2.5-1.5 5.1-1.7 7.6-.3 2.8-2.1 5.4-4.8 5.9-1.6.3-2.9-.8-3.3-2.2-.5 1.4-1.8 2.5-3.4 2.2-2.7-.5-4.5-3.1-4.8-5.9-.2-2.5-.9-5.1-1.7-7.6-.8-2.3-1.4-4.4-1.4-6.7C13.5 13 18.2 9 24 9Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M18.5 21.5c2.2 2.8 4.1 4 5.5 4s3.3-1.2 5.5-4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Box>
  );
}

export function BrandLogo({ size = 40, showWordmark = true, wordmarkColor = "#009688" }: BrandLogoProps) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <ToothMark size={size} />
      {showWordmark ? (
        <Typography
          component="span"
          sx={{
            fontWeight: 800,
            color: wordmarkColor,
            letterSpacing: "-0.02em",
            fontSize: size >= 48 ? "1.85rem" : size >= 36 ? "1.45rem" : "1.25rem",
            lineHeight: 1,
          }}
        >
          iSmile
        </Typography>
      ) : null}
    </Box>
  );
}
