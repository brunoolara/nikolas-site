// CMV: números de custo e margem. Só o master.

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "CMV",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutCmv({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("master");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="cmv" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
