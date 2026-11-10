import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// O mesmo arquivo serve os dois endereços. No painel ele vira o atalho
// instalável no celular ("Adicionar à tela de início"): abre em tela cheia,
// sem a barra do navegador, como um aplicativo. No site continua como antes.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  if (host.startsWith("painel.")) {
    return {
      id: "/",
      name: "Painel do Nikola's",
      short_name: "Nikola's",
      description: "Caixinha, estoque, posts e o ao vivo do Nikola's Restaurante.",
      lang: "pt-BR",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#fbf8f2",
      theme_color: "#1e4b39",
      icons: [
        { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      ],
    };
  }
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
