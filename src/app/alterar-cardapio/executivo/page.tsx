import { lerCardapio } from "@/lib/menu/armazem";
import Editor from "./Editor";

export default async function EditarExecutivo() {
  const cardapio = await lerCardapio();
  return (
    <Editor
      menu={cardapio.executivo}
      atualizadoEm={cardapio.atualizadoEm}
      atualizadoPor={cardapio.atualizadoPor}
    />
  );
}
