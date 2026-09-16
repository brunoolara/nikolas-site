import type { MetadataRoute } from "next";
import { restaurante } from "@/data/restaurante";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${restaurante.siteUrl}/sitemap.xml`,
  };
}
