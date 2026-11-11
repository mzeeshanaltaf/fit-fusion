import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 130,
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
