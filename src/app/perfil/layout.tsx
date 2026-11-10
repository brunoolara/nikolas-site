// Perfil: qualquer pessoa logada vê o seu.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/acessos/sessao";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Perfil",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutPerfil({ children }: { children: React.ReactNode }) {
  if (!(await sessaoAtual())) redirect("/");
  return (
    <div className="painel">
      <Moldura atual="perfil" />
      {children}
    </div>
  );
}
