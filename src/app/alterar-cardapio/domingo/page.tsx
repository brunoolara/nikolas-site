import { lerCardapio } from "@/lib/menu/armazem";
import EditorSalao from "../EditorSalao";
import { ROTULO_PECA } from "@/lib/menu/tipos";

export default async function EditarDomingo() {
  const cardapio = await lerCardapio();
  return (
    <EditorSalao
      menu={cardapio.salao}
      atualizadoEm={cardapio.atualizadoEm}
      atualizadoPor={cardapio.atualizadoPor}
      titulo={ROTULO_PECA.domingo.nome}
      imprimirEm={ROTULO_PECA.domingo.imprimir}
      folhaDomingo
    />
  );
}
