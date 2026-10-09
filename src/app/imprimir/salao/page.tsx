// Menu do salão pronto para imprimir: capa "Nossa história" + 7 folhas.
// A folha de domingo fica de fora — ela é avulsa, em /imprimir/domingo.

import type { Metadata } from "next";
import { lerCardapio } from "@/lib/menu/armazem";
import FolhaSalao from "../FolhaSalao";
import BarraImpressao from "../BarraImpressao";
import AvisoEstouro from "../AvisoEstouro";
import "../imprimir.css";
import "../salao.css";

export const metadata: Metadata = {
  title: "Menu do salão para impressão",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MenuSalaoImpressao() {
  const { salao } = await lerCardapio();
  const folhas = salao.folhas.filter((f) => !f.abre);

  return (
    <div className="papel-fora">
      <BarraImpressao voltarPara="/alterar-cardapio/salao" />
      <AvisoEstouro />
      {folhas.map((folha) => (
        <FolhaSalao
          key={folha.titulo}
          folha={folha}
          menu={salao}
        />
      ))}
    </div>
  );
}
