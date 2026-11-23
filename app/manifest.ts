import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Remindo",
    short_name: "Remindo",
    description: "Ingat tugasmu, tuntaskan tepat waktu.",
    lang: "id",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8f8ff",
    theme_color: "#4338ca",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
