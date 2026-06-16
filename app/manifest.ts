import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lyric Royale",
    short_name: "LyricRoyale",
    description: "A bilingual lyric battle game powered by live Musixmatch data.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
  };
}
