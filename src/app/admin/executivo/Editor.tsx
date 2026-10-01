"use client";

// Tela de edição do menu executivo. Pensada para quem não é designer:
// campos com nome claro, nada de arrastar, e "Ver e imprimir" sempre à mão.

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { acaoSalvar } from "../acoes";
import Mover, { mover } from "../Mover";
import { DIAS, ROTULO_DIA, type Dia, type Item, type MenuExecutivo } from "@/lib/menu/tipos";

type Props = { menu: MenuExecutivo; atualizadoEm: string; atualizadoPor: string };

const campo = "w-full rounded border border-linha bg-white px-2.5 py-1.5";

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
        <div key={i} className="rounded border border-linha bg-creme/40 p-3">
          <div className="flex gap-2">
            <Mover
              indice={i}
              total={itens.length}
              aoMover={(para) => aoMudar(mover(itens, i, para))}
              oQue="prato"
            />
            <input
              className={campo}
              placeholder="Nome do prato"
              value={item.nome}
              onChange={(e) => mudar(i, { nome: e.target.value })}
            />
            <input
              className="w-28 rounded border border-linha bg-white px-2.5 py-1.5 text-right"
              placeholder="0,00"
              inputMode="decimal"
              value={precoParaTexto(item.preco)}
              onChange={(e) => mudar(i, { preco: textoParaPreco(e.target.value) })}
            />
            <button
              type="button"
              title="Remover este prato"
              onClick={() => aoMudar(itens.filter((_, k) => k !== i))}
              className="shrink-0 rounded border border-linha px-3 text-cafe hover:bg-white"
            >
              Remover
            </button>
          </div>
          <input
            className={`${campo} mt-2 text-sm`}
            placeholder="Acompanhamentos (opcional) — ex.: Salada, arroz e fritas."
            value={item.desc ?? ""}
            onChange={(e) => mudar(i, { desc: e.target.value })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => aoMudar([...itens, { nome: "", preco: null }])}
        className="rounded border border-dashed border-cafe/50 px-3 py-1.5 text-sm text-cafe hover:bg-creme"
      >
        + {rotuloNovo}
      </button>
    </div>
  );
}

export default function Editor({ menu: inicial, atualizadoEm, atualizadoPor }: Props) {
  const [menu, setMenu] = useState<MenuExecutivo>(inicial);
  // nome de quem edita, lembrado no navegador. Lido por useSyncExternalStore
  // para não precisar de um efeito que chama setState logo ao montar.
  const autorGuardado = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem("nikolas:autor") ?? "",
    () => "",
  );
  const [digitado, setDigitado] = useState<string | null>(null);
  const autor = digitado ?? autorGuardado;
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
      localStorage.setItem("nikolas:autor", autor);
      const r = await acaoSalvar(menu, autor);
      setAviso(r.mensagem);
      if (r.ok) setSujo(false);
    });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-linha pb-4">
        <div>
          <h1 className="font-display text-3xl">Menu executivo</h1>
          <p className="mt-1 text-sm text-cafe">
            Última alteração por {atualizadoPor} em{" "}
            {new Date(atualizadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/imprimir/executivo"
            target="_blank"
            className="rounded border border-verde px-3 py-2 text-sm font-semibold text-verde hover:bg-verde hover:text-papel"
          >
            Ver e imprimir
          </a>
          <a
            href="/admin"
            className="rounded border border-linha px-3 py-2 text-sm text-cafe hover:bg-creme"
          >
            Voltar
          </a>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Título da peça</span>
          <input className={`${campo} mt-1`} value={menu.titulo} onChange={(e) => mudar({ titulo: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Dias e horário</span>
          <input
            className={`${campo} mt-1`}
            value={menu.horario}
            onChange={(e) => mudar({ horario: e.target.value })}
          />
          <span className="mt-1 block text-xs text-cafe">
            Aparece na capa e no alto do verso. Ex.: Segunda a domingo · 11h às 14h
          </span>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold">Frase da capa</span>
          <input className={`${campo} mt-1`} value={menu.frase} onChange={(e) => mudar({ frase: e.target.value })} />
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
          <div key={dia} className="mt-6 rounded border border-linha p-4">
            <h3 className="font-semibold">{ROTULO_DIA[dia]}</h3>
            <LinhasItens
              itens={itensDoDia(dia)}
              rotuloNovo={`Acrescentar prato de ${ROTULO_DIA[dia].toLowerCase()}`}
              aoMudar={(itens) => mudarDia(dia, itens)}
            />
          </div>
        ))}
      </section>

      {/* barra fixa: salvar nunca fica longe */}
      <div className="fixed inset-x-0 bottom-0 border-t border-linha bg-papel/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <input
            className="w-40 rounded border border-linha bg-white px-2.5 py-1.5 text-sm"
            placeholder="Seu nome"
            value={autor}
            onChange={(e) => setDigitado(e.target.value)}
          />
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="rounded bg-verde px-5 py-2.5 font-semibold text-papel hover:bg-verde-escuro disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          {sujo ? <span className="text-sm text-cafe">Há alterações não salvas.</span> : null}
          {aviso ? <span className="text-sm font-medium">{aviso}</span> : null}
        </div>
      </div>
    </div>
  );
}
