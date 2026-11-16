import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlainPaper",
    short_name: "PlainPaper",
    description: "Offer letters, rent agreements and insurance policies, explained in plain words before you sign.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F1E8",
    theme_color: "#F5F1E8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
