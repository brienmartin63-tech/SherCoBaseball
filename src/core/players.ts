import type { Speed } from "./types";

export interface Normalized1980Ratings {
  source: string;
  display: string;
  speed: Speed;
  ignored: string[];
}

export function normalize1980Ratings(source: string): Normalized1980Ratings {
  const ignored = [...source.matchAll(/\[(HP|WP)\]/gi)].map((match) => match[0]);
  let display = source.replace(/\[(HP|WP)\]/gi, "").replace(/\*{3,}/g, "**");
  display = display.replace(/\s{2,}/g, " ").trim();
  const stars = display.match(/\*{1,2}/)?.[0];
  const speed: Speed = stars === "**" ? "**" : stars === "*" ? "*" : "REGULAR";
  return { source, display, speed, ignored };
}
