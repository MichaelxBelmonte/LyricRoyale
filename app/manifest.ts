import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soundclash",
    short_name: "Soundclash",
    description: "The music party game where friends clash on the same track. Powered by live Musixmatch lyrics.",
    start_url: "/",
    display: "standalone",
    background_color: "#15120E",
    theme_color: "#15120E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
