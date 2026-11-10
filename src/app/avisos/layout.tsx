// Avisos: qualquer pessoa logada vê os seus.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/acessos/sessao";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Avisos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutAvisos({ children }: { children: React.ReactNode }) {
  if (!(await sessaoAtual())) redirect("/");
  return (
    <div className="painel">
      <Moldura atual="avisos" />
      {children}
    </div>
  );
}
