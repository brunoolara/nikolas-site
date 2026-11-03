import { lerCardapio } from "@/lib/menu/armazem";
import EditorSalao from "../EditorSalao";
import { ROTULO_PECA } from "@/lib/menu/tipos";
import { exigir } from "@/lib/acessos/sessao";

export default async function EditarSalao() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("cardapio")).liberado) return null;
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
