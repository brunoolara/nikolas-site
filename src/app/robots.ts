import type { MetadataRoute } from "next";
import { restaurante } from "@/data/restaurante";

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin e /imprimir são ferramentas internas: ficam de fora das buscas.
    // As duas páginas também mandam "noindex" no próprio cabeçalho.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/imprimir"] },
    sitemap: `${restaurante.siteUrl}/sitemap.xml`,
  };
}
