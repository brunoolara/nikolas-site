// Caixinha do turno: a tela do PC do restaurante (ver page.tsx).

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Caixinha do turno",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutCaixinhaTurno({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("caixinha-turno");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="caixinha-turno" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
