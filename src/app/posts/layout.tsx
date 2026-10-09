// Área de posts: abre com a senha do dono (cria e edita) ou com a da equipe
// (só vê, compartilha e marca como publicado).

import type { Metadata } from "next";
import { papel } from "@/lib/menu/sessao";
import Entrar from "../admin/Entrar";
import { acaoEntrarPosts } from "./acoes";
import "../admin/admin.css";

export const metadata: Metadata = {
  title: "Posts do Nikola's",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutPosts({ children }: { children: React.ReactNode }) {
  if (!(await papel())) {
    return (
      <div className="painel">
        <Entrar acao={acaoEntrarPosts} subtitulo="Entre para ver os posts do dia." />
      </div>
    );
  }
  return <div className="painel">{children}</div>;
}
