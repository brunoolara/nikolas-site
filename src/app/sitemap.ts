import type { MetadataRoute } from "next";
import { restaurante } from "@/data/restaurante";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = restaurante.siteUrl;
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/cardapio`, priority: 0.9 },
    { url: `${base}/delivery`, priority: 0.8 },
    { url: `${base}/sobre`, priority: 0.6 },
    { url: `${base}/contato`, priority: 0.7 },
  ];
}
