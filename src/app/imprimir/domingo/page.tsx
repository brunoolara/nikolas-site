// A folha extra dos especiais de domingo, que entra na pasta só aos domingos.

import type { Metadata } from "next";
import { lerCardapio } from "@/lib/menu/armazem";
import FolhaSalao from "../FolhaSalao";
import BarraImpressao from "../BarraImpressao";
import AvisoEstouro from "../AvisoEstouro";
import Encaixe from "../Encaixe";
import "../imprimir.css";
import "../salao.css";

export const metadata: Metadata = {
  title: "Especiais de domingo para impressão",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DomingoImpressao() {
  const { salao } = await lerCardapio();
  const folha = salao.folhas.find((f) => f.abre);

  if (!folha) {
    return (
      <div className="papel-fora">
        <BarraImpressao voltarPara="/alterar-cardapio/domingo" />
        <p className="so-tela p-8 text-papel">A folha de domingo não está no cardápio salvo.</p>
      </div>
    );
  }

  return (
    <div className="papel-fora">
      <BarraImpressao voltarPara="/alterar-cardapio/domingo" />
      <Encaixe />
      <AvisoEstouro />
      <FolhaSalao folha={folha} menu={salao} />
    </div>
  );
}
