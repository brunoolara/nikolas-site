"use client";

// Editor das peças do salão. A tela de domingo é o mesmo componente: com
// `folhaDomingo`, mostra só as seções daquela folha. As listas de seções saem
// do estado ao vivo, e não de uma lista fixada no servidor — senão uma
// categoria recém-criada só apareceria ao recarregar a página.

import { useEffect, useState, useTransition } from "react";
import { acaoSalvarSalao } from "./acoes";
import CamposItem, { campo } from "./CamposItem";
import { mover } from "./Mover";
import NovaCategoria, { idDoNome, type Destino } from "./NovaCategoria";
import { ID_VIRADAO } from "@/lib/menu/viradao";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";
import type { FolhaSalao, ItemSalao, MenuSalao, SecaoSalao } from "@/lib/menu/tipos";

type Props = {
  menu: MenuSalao;
  atualizadoEm: string;
  atualizadoPor: string;
  titulo: string;
  imprimirEm: string;

  /** Mostra os campos da folha de domingo (chamada e frase). */
  folhaDomingo?: boolean;
  /** Tela do menu completo: libera a frase da casa e o texto da "Nossa história".
   *  Precisa ser explícito: deduzir isso de outra coisa já fez esses campos
   *  sumirem da tela sem ninguém notar. */
  completo?: boolean;
};

const ITEM_VAZIO: ItemSalao = { nome: "", precos: [null] };

export default function EditorSalao({
  menu: inicial,
  atualizadoEm,
  atualizadoPor,
  titulo,
  imprimirEm,
  folhaDomingo = false,
  completo = false,
}: Props) {
  const [menu, setMenu] = useState<MenuSalao>(inicial);
  const [aviso, setAviso] = useState("");
  const [sujo, setSujo] = useState(false);
  const [salvando, iniciar] = useTransition();

  useEffect(() => {
    if (!sujo) return;
    const alerta = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alerta);
    return () => window.removeEventListener("beforeunload", alerta);
  }, [sujo]);

  const mudar = (troca: Partial<MenuSalao>) => {
    setMenu((m) => ({ ...m, ...troca }));
    setSujo(true);
  };

  // A folha de domingo tem tela própria: ou mostramos só o que é dela, ou tudo
  // menos o que é dela.
  const indiceDomingo = menu.folhas.findIndex((f) => f.abre);
  const idsDomingo = new Set(indiceDomingo === -1 ? [] : menu.folhas[indiceDomingo].secoes);
  const visiveis = menu.secoes.filter((s) =>
    folhaDomingo ? idsDomingo.has(s.id) : !idsDomingo.has(s.id),
  );

  const mudarSecao = (id: string, troca: Partial<SecaoSalao>) =>
    mudar({ secoes: menu.secoes.map((s) => (s.id === id ? { ...s, ...troca } : s)) });

  const folha = menu.folhas.find((f) => f.abre);
  const mudarFolha = (troca: Partial<typeof folha>) =>
    folha && mudar({ folhas: menu.folhas.map((f) => (f.abre ? { ...f, ...troca } : f)) });

  const criarCategoria = (nome: string, destino: Destino, doisPrecos: boolean) => {
    const id = idDoNome(nome, menu.secoes.map((s) => s.id));
    const nova: SecaoSalao = {
      id,
      titulo: nome,
      itens: [],
      ...(doisPrecos ? { colunas: ["1 pessoa", "2 pessoas"] as [string, string] } : {}),
    };

    let folhas: FolhaSalao[];
    if (destino.tipo === "nova") {
      const folhaNova: FolhaSalao = {
        titulo: nome,
        variantes: [],
        miolo: "",
        quadro: false,
        grupos: [[id]],
        quadroSecoes: [],
        secoes: [id],
      };
      // entra antes da folha de domingo, que é sempre a última
      const corte = menu.folhas.findIndex((f) => f.abre);
      folhas =
        corte === -1
          ? [...menu.folhas, folhaNova]
          : [...menu.folhas.slice(0, corte), folhaNova, ...menu.folhas.slice(corte)];
    } else {
      folhas = menu.folhas.map((f, i) => {
        if (i !== destino.folha) return f;
        const grupos = f.grupos.length ? f.grupos.map((g) => [...g]) : [[]];
        (grupos[destino.coluna] ?? grupos[0]).push(id);
        return { ...f, grupos, secoes: [...f.secoes, id] };
      });
    }

    mudar({ secoes: [...menu.secoes, nova], folhas });
  };

  const removerCategoria = (id: string) => {
    const secao = menu.secoes.find((s) => s.id === id);
    const quantos = secao?.itens.length ?? 0;
    const aviso =
      quantos > 0
        ? `Remover a categoria "${secao?.titulo || id}" e os ${quantos} pratos dentro dela?`
        : `Remover a categoria "${secao?.titulo || id}"?`;
    if (!window.confirm(aviso)) return;

    mudar({
      secoes: menu.secoes.filter((s) => s.id !== id),
      // tira a seção das folhas, e descarta a folha que ficar sem nada
      folhas: menu.folhas
        .map((f) => ({
          ...f,
          grupos: f.grupos.map((g) => g.filter((x) => x !== id)).filter((g) => g.length),
          quadroSecoes: f.quadroSecoes.filter((x) => x !== id),
          secoes: f.secoes.filter((x) => x !== id),
        }))
        .filter((f) => f.miolo === "hist" || f.abre || f.secoes.length > 0),
    });
  };

  const salvar = () =>
    iniciar(async () => {
      const r = await acaoSalvarSalao(menu, titulo);
      setAviso(r.mensagem);
      if (r.ok) setSujo(false);
    });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8">
      <Cabecalho
        voltar={{ href: "/alterar-cardapio", rotulo: "Cardápio" }}
        titulo={titulo}
        descricao={`Última alteração por ${atualizadoPor} em ${new Date(atualizadoEm).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        })}`}
        acoes={
          <a href={imprimirEm} target="_blank" className="p-btn p-btn-secundario">
            <Icone nome="imprimir" className="h-4 w-4" />
            Ver e imprimir
          </a>
        }
      />

      {folhaDomingo && folha ? (
        <section className="p-cartao mt-8 grid gap-4 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="p-rotulo">Chamada</span>
            <input
              className={campo}
              value={folha.eyebrow ?? ""}
              onChange={(e) => mudarFolha({ eyebrow: e.target.value })}
            />
            <span className="p-ajuda">Ex.: Só no almoço de domingo</span>
          </label>
          <label className="block">
            <span className="p-rotulo">Frase da folha</span>
            <input
              className={campo}
              value={folha.frase ?? ""}
              onChange={(e) => mudarFolha({ frase: e.target.value })}
            />
          </label>
        </section>
      ) : null}

      {completo ? (
        <section className="p-cartao mt-8 p-5">
          <label className="block">
            <span className="p-rotulo">Frase da casa</span>
            <input
              className={campo}
              value={menu.frase}
              onChange={(e) => mudar({ frase: e.target.value })}
            />
            <span className="p-ajuda">
              Aparece na capa e nos blocos verdes.
            </span>
          </label>
          <details className="mt-4 rounded-[var(--p-raio-sm)] border border-linha bg-creme/50 p-4">
            <summary className="cursor-pointer font-semibold">Texto da &ldquo;Nossa história&rdquo;</summary>
            <div className="mt-3 space-y-2">
              {menu.historia.map((p, i) => (
                <textarea
                  key={i}
                  className={`${campo} min-h-20 text-sm`}
                  value={p}
                  onChange={(e) =>
                    mudar({ historia: menu.historia.map((t, k) => (k === i ? e.target.value : t)) })
                  }
                />
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {visiveis.map((secao) => (
        <section key={secao.id} className="mt-10">
          <div className="flex flex-wrap items-baseline gap-3">
            <input
              className="min-w-0 flex-1 rounded-[var(--p-raio-sm)] border border-transparent bg-transparent px-2 py-1 font-display text-2xl hover:border-linha focus:border-verde focus:bg-white focus:outline-none"
              aria-label="Nome da categoria"
              value={secao.titulo ?? ""}
              placeholder="(usa o título da folha)"
              onChange={(e) => mudarSecao(secao.id, { titulo: e.target.value })}
            />
            <span className="p-selo">{secao.itens.length} itens</span>
            {secao.id === ID_VIRADAO ? (
              <span className="p-selo p-selo-verde">Fixo aos domingos</span>
            ) : (
              <button
                type="button"
                onClick={() => removerCategoria(secao.id)}
                className="p-btn p-btn-perigo p-btn-sm"
              >
                Remover categoria
              </button>
            )}
          </div>
          <input
            className={`${campo} mt-2 text-sm italic`}
            placeholder="Frase abaixo do título (opcional)"
            value={secao.nota ?? ""}
            onChange={(e) => mudarSecao(secao.id, { nota: e.target.value })}
          />

          <div className="mt-3 space-y-3">
            {secao.itens.map((item, i) => (
              <CamposItem
                key={i}
                item={item}
                colunas={secao.colunas}
                aoMudar={(troca) =>
                  mudarSecao(secao.id, {
                    itens: secao.itens.map((it, k) => (k === i ? { ...it, ...troca } : it)),
                  })
                }
                aoRemover={() =>
                  mudarSecao(secao.id, { itens: secao.itens.filter((_, k) => k !== i) })
                }
                indice={i}
                total={secao.itens.length}
                aoMover={(para) => mudarSecao(secao.id, { itens: mover(secao.itens, i, para) })}
              />
            ))}
            <button
              type="button"
              onClick={() => mudarSecao(secao.id, { itens: [...secao.itens, { ...ITEM_VAZIO }] })}
              className="p-btn w-full border-dashed border-cafe/40 text-cafe hover:border-verde hover:bg-white hover:text-verde"
            >
              <Icone nome="mais" className="h-4 w-4" />
              Acrescentar prato
            </button>
          </div>
        </section>
      ))}

      {completo || (folhaDomingo && indiceDomingo !== -1) ? (
        <NovaCategoria
          menu={menu}
          aoCriar={criarCategoria}
          destinoFixo={
            folhaDomingo ? { tipo: "folha", folha: indiceDomingo, coluna: 0 } : undefined
          }
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-papel/95 shadow-[0_-4px_16px_rgb(27_23_16/0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <button type="button" onClick={salvar} disabled={salvando} className="p-btn p-btn-primario min-w-32">
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          {sujo ? <span className="p-selo">Há alterações não salvas</span> : null}
          {aviso ? <span className="text-sm font-medium">{aviso}</span> : null}
        </div>
      </div>
    </div>
  );
}
