import { lerCardapio } from "@/lib/menu/armazem";
import EditorSalao from "../EditorSalao";
import { ROTULO_PECA } from "@/lib/menu/tipos";

export default async function EditarSalao() {
  const cardapio = await lerCardapio();
  // a folha de domingo tem tela própria; aqui ficam as seções do menu completo
  const doDomingo = new Set(
    cardapio.salao.folhas.filter((f) => f.abre).flatMap((f) => f.secoes),
  );
  return (
    <EditorSalao
      menu={cardapio.salao}
      atualizadoEm={cardapio.atualizadoEm}
      atualizadoPor={cardapio.atualizadoPor}
      titulo={ROTULO_PECA.salao.nome}
      imprimirEm={ROTULO_PECA.salao.imprimir}
      apenas={cardapio.salao.secoes.map((s) => s.id).filter((id) => !doDomingo.has(id))}
    />
  );
}
