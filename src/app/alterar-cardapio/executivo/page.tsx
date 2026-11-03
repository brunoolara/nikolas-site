import { lerCardapio } from "@/lib/menu/armazem";
import Editor from "./Editor";
import { exigir } from "@/lib/acessos/sessao";

export default async function EditarExecutivo() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("cardapio")).liberado) return null;
  const cardapio = await lerCardapio();
  return (
    <Editor
      menu={cardapio.executivo}
      atualizadoEm={cardapio.atualizadoEm}
      atualizadoPor={cardapio.atualizadoPor}
    />
  );
}
