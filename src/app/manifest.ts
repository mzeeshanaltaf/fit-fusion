import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitFusion",
    short_name: "FitFusion",
    description:
      "Generate personalized workout and nutrition plans powered by AI.",
    start_url: "/",
    display: "standalone",
    theme_color: "#059669",
    background_color: "#0a0a0a",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
