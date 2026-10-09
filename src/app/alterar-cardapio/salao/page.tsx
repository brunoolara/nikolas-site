import { lerCardapio } from "@/lib/menu/armazem";
import EditorSalao from "../EditorSalao";
import { ROTULO_PECA } from "@/lib/menu/tipos";

export default async function EditarSalao() {
  const cardapio = await lerCardapio();
  return (
    <EditorSalao
      menu={cardapio.salao}
      atualizadoEm={cardapio.atualizadoEm}
      atualizadoPor={cardapio.atualizadoPor}
      titulo={ROTULO_PECA.salao.nome}
      imprimirEm={ROTULO_PECA.salao.imprimir}
      completo
    />
  );
}
