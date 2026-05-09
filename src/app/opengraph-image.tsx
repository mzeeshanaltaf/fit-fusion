import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FitFusion — AI-Powered Fitness Plans Tailored to You";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #0d9488 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background glow circles */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />

        {/* Dumbbell icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 24,
            width: 100,
            height: 100,
            marginBottom: 32,
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.4 14.4 9.6 9.6" />
            <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
            <path d="m21.5 21.5-1.4-1.4" />
            <path d="M3.9 3.9 2.5 2.5" />
            <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          FitFusion
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          AI-Powered Fitness Plans Tailored to You
        </div>

        {/* Bottom badge */}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 999,
            padding: "8px 20px",
            fontSize: 18,
            color: "rgba(255,255,255,0.9)",
            fontWeight: 500,
          }}
        >
          Personalized · Instant · Free to Start
        </div>
      </div>
    ),
    { ...size }
  );
}
