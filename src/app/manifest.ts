import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitFusion",
    short_name: "FitFusion",
    description:
      "A workout plan and 5 days of meals, built from your profile.",
    start_url: "/",
    display: "standalone",
    theme_color: "#c82700",
    background_color: "#f8f5f1",
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
