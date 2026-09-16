import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // URLs do site antigo (Google Sites) continuam funcionando.
  async redirects() {
    return [
      { source: "/página-inicial", destination: "/", permanent: true },
      { source: "/p%C3%A1gina-inicial", destination: "/", permanent: true },
      { source: "/cardápio", destination: "/cardapio", permanent: true },
      { source: "/card%C3%A1pio", destination: "/cardapio", permanent: true },
      { source: "/como-chegar", destination: "/contato", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
