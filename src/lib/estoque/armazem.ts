// Onde a contagem de estoque mora (loja privada do site):
// - estoque/contagens/<segunda>.json: a contagem da semana, item a item, e o
//   fechamento com o saldo e o custo que a Takeat mostrava naquele momento
//   (base do comparativo e do CMV real).
// - estoque/itens.json: categoria trocada à mão e itens que não se contam.
// Os itens em si vêm do cadastro de insumos da Takeat (lib/estoque/insumos).
//
// Cada gravação relê e regrava com ifMatch: duas pessoas contando ao mesmo
// tempo não apagam o que a outra digitou.

import "server-only";
import { get, put } from "@/lib/loja";
import { forte } from "@/lib/etag";
import type { Categoria } from "./categorias";

const PASTA = process.env.NODE_ENV === "production" ? "estoque" : "estoque-teste";

export type Lancamento = { qtd: number; por: string; em: string };

export type Fechamento = {
  em: string;
  por: string;
  /** Saldo e custo unitário na Takeat no fechamento, por id de insumo. */
  takeat: Record<string, { saldo: number; custo: number }> | null;
  /** Por que não há saldo da Takeat, se não houver. */
  semTakeat?: string;
};

export type Contagem = {
  semana: string;
  itens: Record<string, Lancamento>;
  fechada?: Fechamento;
};

export type Ajustes = Record<string, { categoria?: Categoria; naoContar?: boolean }>;

async function ler<T>(caminho: string): Promise<{ valor: T | null; etag?: string }> {
  const res = await get(caminho, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { valor: null };
  return { valor: (await new Response(res.stream).json()) as T, etag: forte(res.blob.etag) };
}

async function atualizar<T>(caminho: string, vazio: () => T, mudar: (atual: T) => T): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    const { valor, etag } = await ler<T>(caminho);
    const novo = mudar(valor ?? vazio());
    try {
      await put(caminho, JSON.stringify(novo), {
        access: "private",
        contentType: "application/json",
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
      });
      return novo;
    } catch (erro) {
      if (tentativa >= 4) throw erro;
    }
  }
}

const arquivoContagem = (semana: string) => `${PASTA}/contagens/${semana}.json`;

export async function lerContagem(semana: string): Promise<Contagem> {
  return (await ler<Contagem>(arquivoContagem(semana))).valor ?? { semana, itens: {} };
}

export function atualizarContagem(semana: string, mudar: (c: Contagem) => Contagem) {
  return atualizar<Contagem>(arquivoContagem(semana), () => ({ semana, itens: {} }), mudar);
}

export async function lerAjustes(): Promise<Ajustes> {
  return (await ler<Ajustes>(`${PASTA}/itens.json`)).valor ?? {};
}

export function atualizarAjustes(mudar: (a: Ajustes) => Ajustes) {
  return atualizar<Ajustes>(`${PASTA}/itens.json`, () => ({}), mudar);
}
