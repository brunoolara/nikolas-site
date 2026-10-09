// Área de posts: o funcionário com acesso a posts vê, compartilha, baixa e
// marca como publicado. Só o master cria e edita.

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Posts do Nikola's",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutPosts({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("posts");
  return <div className="painel">{liberado ? children : <SemAcesso nome={sessao.nome} />}</div>;
}
