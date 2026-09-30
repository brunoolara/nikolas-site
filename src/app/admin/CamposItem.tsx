"use client";

// Campos de um item do menu do salão. Usado pelo editor do salão e pelo de
// domingo — são a mesma peça, só mudam as seções que entram.

import type { ItemSalao } from "@/lib/menu/tipos";

export const campo = "w-full rounded border border-linha bg-white px-2.5 py-1.5";

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
}: {
  item: ItemSalao;
  colunas?: [string, string];
  aoMudar: (troca: Partial<ItemSalao>) => void;
  aoRemover: () => void;
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
    <div className="rounded border border-linha bg-creme/40 p-3">
      <div className="flex flex-wrap gap-2">
        <input
          className={`${campo} min-w-48 flex-1`}
          placeholder="Nome do prato"
          value={item.nome}
          onChange={(e) => aoMudar({ nome: e.target.value })}
        />
        <input
          className="w-24 rounded border border-linha bg-white px-2.5 py-1.5 text-right"
          placeholder={colunas ? colunas[0] : "0,00"}
          title={colunas ? colunas[0] : "Preço"}
          inputMode="decimal"
          value={precoParaTexto(precos[0])}
          onChange={(e) => mudarPreco(0, e.target.value)}
        />
        {colunas ? (
          <input
            className="w-24 rounded border border-linha bg-white px-2.5 py-1.5 text-right"
            placeholder={colunas[1]}
            title={`${colunas[1]} — deixe vazio se o prato tem preço único`}
            inputMode="decimal"
            value={precoParaTexto(precos[1])}
            onChange={(e) => mudarPreco(1, e.target.value)}
          />
        ) : null}
        <button
          type="button"
          onClick={aoRemover}
          className="rounded border border-linha px-3 text-cafe hover:bg-white"
        >
          Remover
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          className="w-32 rounded border border-linha bg-white px-2.5 py-1.5 text-sm"
          placeholder="4 unidades"
          title="Unidade ou peso (opcional)"
          value={item.unidade ?? ""}
          onChange={(e) => aoMudar({ unidade: e.target.value })}
        />
        <input
          className="w-44 rounded border border-linha bg-white px-2.5 py-1.5 text-sm"
          placeholder="Quinta a domingo"
          title="Quando é servido (opcional) — sai em âmbar"
          value={item.dia ?? ""}
          onChange={(e) => aoMudar({ dia: e.target.value })}
        />
        <input
          className={`${campo} min-w-48 flex-1 text-sm`}
          placeholder="Descrição (opcional)"
          value={item.desc ?? ""}
          onChange={(e) => aoMudar({ desc: e.target.value })}
        />
      </div>
    </div>
  );
}
