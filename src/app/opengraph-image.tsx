import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FitFusion: a workout plan and 5 days of meals, built from your profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Full vermilion field, chalk type. Colours match globals.css (#c82700, #f8f5f1).
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#c82700",
          color: "#f8f5f1",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 4 }}>
          FITFUSION
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: -4,
          }}
        >
          <span>YOUR</span>
          <span>PLAN.</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 600 }}>
          250 workouts. 5 days of meals. 10 free plans.
        </div>
      </div>
    ),
    { ...size }
  );
}
