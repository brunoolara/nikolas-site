"use client";

// Tela de edição do menu executivo. Pensada para quem não é designer:
// campos com nome claro, nada de arrastar, e "Ver e imprimir" sempre à mão.

import { useEffect, useState, useTransition } from "react";
import { acaoSalvar } from "../acoes";
import Mover, { mover } from "../Mover";
import { DIAS, ROTULO_DIA, type Dia, type Item, type MenuExecutivo } from "@/lib/menu/tipos";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";

type Props = { menu: MenuExecutivo; atualizadoEm: string; atualizadoPor: string };

const campo = "p-campo";

function precoParaTexto(p: number | null): string {
  return p === null ? "" : String(p).replace(".", ",");
}
function textoParaPreco(t: string): number | null {
  const limpo = t.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function LinhasItens({
  itens,
  aoMudar,
  rotuloNovo,
}: {
  itens: Item[];
  aoMudar: (itens: Item[]) => void;
  rotuloNovo: string;
}) {
  const mudar = (i: number, troca: Partial<Item>) =>
    aoMudar(itens.map((item, k) => (k === i ? { ...item, ...troca } : item)));

  return (
    <div className="mt-3 space-y-3">
      {itens.map((item, i) => (
        <div key={i} className="p-cartao flex gap-3 p-3">
          <Mover
            indice={i}
            total={itens.length}
            aoMover={(para) => aoMudar(mover(itens, i, para))}
            oQue="prato"
          />
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <input
              className={`${campo} col-span-2 sm:col-span-1`}
              placeholder="Nome do prato"
              aria-label="Nome do prato"
              value={item.nome}
              onChange={(e) => mudar(i, { nome: e.target.value })}
            />
            <label className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-cafe">R$</span>
              <input
                className={`${campo} pl-9 text-right tabular-nums`}
                placeholder="0,00"
                aria-label="Preço"
                inputMode="decimal"
                value={precoParaTexto(item.preco)}
                onChange={(e) => mudar(i, { preco: textoParaPreco(e.target.value) })}
              />
            </label>
            <button
              type="button"
              title="Remover este prato"
              onClick={() => aoMudar(itens.filter((_, k) => k !== i))}
              className="p-btn p-btn-perigo"
            >
              Remover
            </button>
            <input
              className={`${campo} col-span-2 text-sm sm:col-span-3`}
              placeholder="Acompanhamentos (opcional) — ex.: Salada, arroz e fritas."
              aria-label="Acompanhamentos"
              value={item.desc ?? ""}
              onChange={(e) => mudar(i, { desc: e.target.value })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => aoMudar([...itens, { nome: "", preco: null }])}
        className="p-btn w-full border-dashed border-cafe/40 text-cafe hover:border-verde hover:bg-white hover:text-verde"
      >
        <Icone nome="mais" className="h-4 w-4" />
        {rotuloNovo}
      </button>
    </div>
  );
}

export default function Editor({ menu: inicial, atualizadoEm, atualizadoPor }: Props) {
  const [menu, setMenu] = useState<MenuExecutivo>(inicial);
  const [aviso, setAviso] = useState("");
  const [salvando, iniciar] = useTransition();
  const [sujo, setSujo] = useState(false);


  // avisa antes de sair com alteração não salva
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  const mudar = (troca: Partial<MenuExecutivo>) => {
    setMenu((m) => ({ ...m, ...troca }));
    setSujo(true);
  };

  const itensDoDia = (dia: Dia): Item[] =>
    menu.especiais.find((e) => e.dia === dia)?.itens ?? [];

  const mudarDia = (dia: Dia, itens: Item[]) => {
    const tem = menu.especiais.some((e) => e.dia === dia);
    mudar({
      especiais: tem
        ? menu.especiais.map((e) => (e.dia === dia ? { ...e, itens } : e))
        : [...menu.especiais, { dia, itens }],
    });
  };

  const salvar = () =>
    iniciar(async () => {
      const r = await acaoSalvar(menu);
      setAviso(r.mensagem);
      if (r.ok) setSujo(false);
    });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8">
      <Cabecalho
        voltar={{ href: "/alterar-cardapio", rotulo: "Cardápio" }}
        titulo="Menu executivo"
        descricao={`Última alteração por ${atualizadoPor} em ${new Date(atualizadoEm).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        })}`}
        acoes={
          <a href="/imprimir/executivo" target="_blank" className="p-btn p-btn-secundario">
            <Icone nome="imprimir" className="h-4 w-4" />
            Ver e imprimir
          </a>
        }
      />

      <section className="p-cartao mt-8 grid gap-4 p-5 sm:grid-cols-2">
        <label className="block">
          <span className="p-rotulo">Título da peça</span>
          <input className={campo} value={menu.titulo} onChange={(e) => mudar({ titulo: e.target.value })} />
        </label>
        <label className="block">
          <span className="p-rotulo">Dias e horário</span>
          <input
            className={campo}
            value={menu.horario}
            onChange={(e) => mudar({ horario: e.target.value })}
          />
          <span className="p-ajuda">
            Aparece na capa e no alto do verso. Ex.: Segunda a domingo · 11h às 14h
          </span>
        </label>
        <label className="block sm:col-span-2">
          <span className="p-rotulo">Frase da capa</span>
          <input className={campo} value={menu.frase} onChange={(e) => mudar({ frase: e.target.value })} />
        </label>
      </section>

      {menu.secoes.map((secao, idx) => (
        <section key={secao.id} className="mt-10">
          <h2 className="font-display text-2xl">{secao.titulo}</h2>
          {secao.nota !== undefined || idx < 2 ? (
            <input
              className={`${campo} mt-2 text-sm italic`}
              placeholder="Frase abaixo do título (opcional)"
              value={secao.nota ?? ""}
              onChange={(e) =>
                mudar({
                  secoes: menu.secoes.map((s, k) => (k === idx ? { ...s, nota: e.target.value } : s)),
                })
              }
            />
          ) : null}
          <LinhasItens
            itens={secao.itens}
            rotuloNovo="Acrescentar prato"
            aoMudar={(itens) =>
              mudar({ secoes: menu.secoes.map((s, k) => (k === idx ? { ...s, itens } : s)) })
            }
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="font-display text-2xl">Especiais do dia</h2>
        <p className="mt-1 text-sm text-cafe">
          Dia sem prato não é impresso — deixe vazio o que não tiver.
        </p>
        {DIAS.map((dia) => (
          <div key={dia} className="mt-6 rounded-[var(--p-raio)] border border-linha bg-creme/50 p-4">
            <h3 className="font-display text-xl">{ROTULO_DIA[dia]}</h3>
            <LinhasItens
              itens={itensDoDia(dia)}
              rotuloNovo={`Acrescentar prato de ${ROTULO_DIA[dia].toLowerCase()}`}
              aoMudar={(itens) => mudarDia(dia, itens)}
            />
          </div>
        ))}
      </section>

      {/* barra fixa: salvar nunca fica longe */}
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
