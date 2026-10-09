import type { MetadataRoute } from "next";
import { restaurante } from "@/data/restaurante";

export default function robots(): MetadataRoute.Robots {
  return {
    // as áreas internas (cardápio, acessos, impressão e posts) são ferramentas internas: ficam de fora das buscas.
    // As duas páginas também mandam "noindex" no próprio cabeçalho.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/alterar-cardapio", "/acessos", "/imprimir", "/posts"] },
    sitemap: `${restaurante.siteUrl}/sitemap.xml`,
  };
}
