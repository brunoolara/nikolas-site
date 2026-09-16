import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nikola's Restaurante",
    short_name: "Nikola's",
    start_url: "/",
    display: "browser",
    background_color: "#fbf8f2",
    theme_color: "#1e4b39",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
