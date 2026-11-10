// Organizar os itens da contagem (só o master): trocar a categoria que a
// separação automática escolheu e tirar da contagem o que não se conta.

import { exigir } from "@/lib/acessos/sessao";
import { lerAjustes } from "@/lib/estoque/armazem";
import { categoriaPeloNome } from "@/lib/estoque/categorias";
import { lerInsumos } from "@/lib/estoque/insumos";
import { mensagemDe } from "@/lib/takeat/cliente";
import Cabecalho from "@/components/painel/Cabecalho";
import Organizar from "./Organizar";

export default async function Itens() {
  const { sessao } = await exigir("estoque");
  if (!sessao.master) return <p className="p-aviso p-aviso-info m-6">Só o Bruno organiza os itens.</p>;
  const ajustes = await lerAjustes();
  let erro = "";
  let insumos: Awaited<ReturnType<typeof lerInsumos>>["insumos"] = [];
  try {
    insumos = (await lerInsumos()).insumos;
  } catch (e) {
    erro = mensagemDe(e);
  }
  const linhas = insumos
    .map((i) => ({
      id: i.id,
      nome: i.nome,
      unidade: i.unidade,
      automatica: categoriaPeloNome(i.nome),
      categoria: ajustes[i.id]?.categoria ?? null,
      naoContar: Boolean(ajustes[i.id]?.naoContar),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        voltar={{ href: "/estoque", rotulo: "Contagem" }}
        titulo="Organizar itens"
        descricao="Os itens vêm do cadastro de insumos da Takeat. A categoria é escolhida pelo nome; troque quando estiver errada, e tire da contagem o que não se conta."
      />
      {erro ? <p className="p-aviso p-aviso-alerta mt-6">Não consegui ler os itens da Takeat: {erro}</p> : <Organizar linhas={linhas} />}
    </div>
  );
}
