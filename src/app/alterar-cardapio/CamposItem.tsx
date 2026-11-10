"use client";

// Campos de um item do menu do salão. Usado pelo editor do salão e pelo de
// domingo — são a mesma peça, só mudam as seções que entram.

import Mover from "./Mover";
import type { ItemSalao } from "@/lib/menu/tipos";

export const campo = "p-campo";

export function precoParaTexto(p: number | null | undefined): string {
  return p === null || p === undefined ? "" : String(p).replace(".", ",");
}

export function textoParaPreco(t: string): number | null {
  const limpo = t.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export default function CamposItem({
  item,
  colunas,
  aoMudar,
  aoRemover,
  indice,
  total,
  aoMover,
}: {
  item: ItemSalao;
  colunas?: [string, string];
  aoMudar: (troca: Partial<ItemSalao>) => void;
  aoRemover: () => void;
  indice: number;
  total: number;
  aoMover: (para: number) => void;
}) {
  const precos = item.precos ?? [];
  const mudarPreco = (i: number, texto: string) => {
    const novos = [...precos];
    while (novos.length <= i) novos.push(null);
    novos[i] = textoParaPreco(texto);
    // preço vazio na segunda coluna volta a ser item de preço único
    aoMudar({ precos: novos[1] === null && novos.length > 1 ? [novos[0]] : novos });
  };

  return (
    <div className="p-cartao flex gap-3 p-3">
      <Mover indice={indice} total={total} aoMover={aoMover} oQue="prato" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            className={`${campo} min-w-0 basis-full sm:basis-0 sm:flex-1`}
            placeholder="Nome do prato"
            aria-label="Nome do prato"
            value={item.nome}
            onChange={(e) => aoMudar({ nome: e.target.value })}
          />
          <input
            className={`${campo} w-0 min-w-0 flex-1 text-right tabular-nums sm:w-24 sm:flex-none`}
            placeholder={colunas ? colunas[0] : "0,00"}
            title={colunas ? colunas[0] : "Preço"}
            aria-label={colunas ? `Preço ${colunas[0]}` : "Preço"}
            inputMode="decimal"
            value={precoParaTexto(precos[0])}
            onChange={(e) => mudarPreco(0, e.target.value)}
          />
          {colunas ? (
            <input
              className={`${campo} w-0 min-w-0 flex-1 text-right tabular-nums sm:w-24 sm:flex-none`}
              placeholder={colunas[1]}
              title={`${colunas[1]} — deixe vazio se o prato tem preço único`}
              aria-label={`Preço ${colunas[1]}`}
              inputMode="decimal"
              value={precoParaTexto(precos[1])}
              onChange={(e) => mudarPreco(1, e.target.value)}
            />
          ) : null}
          <button type="button" onClick={aoRemover} className="p-btn p-btn-perigo shrink-0 px-3">
            Remover
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[8rem_11rem_1fr]">
          <input
            className={`${campo} text-sm`}
            placeholder="4 unidades"
            title="Unidade ou peso (opcional)"
            aria-label="Unidade ou peso"
            value={item.unidade ?? ""}
            onChange={(e) => aoMudar({ unidade: e.target.value })}
          />
          <input
            className={`${campo} text-sm`}
            placeholder="Quinta a domingo"
            title="Quando é servido (opcional) — sai em âmbar"
            aria-label="Quando é servido"
            value={item.dia ?? ""}
            onChange={(e) => aoMudar({ dia: e.target.value })}
          />
          <input
            className={`${campo} col-span-2 text-sm sm:col-span-1`}
            placeholder="Descrição (opcional)"
            aria-label="Descrição"
            value={item.desc ?? ""}
            onChange={(e) => aoMudar({ desc: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
