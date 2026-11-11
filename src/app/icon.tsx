import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Vermilion square, chalk "F". Values match the tokens in globals.css (#c82700, #f8f5f1).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c82700",
          color: "#f8f5f1",
          fontSize: 24,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        F
      </div>
    ),
    { ...size }
  );
}
