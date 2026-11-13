// Cadastro de insumos da Takeat (GET /v1/inventory/inputs, paginado de 100
// em 100): nome, unidade, saldo atual e custo unitário. Guardado por 2 min
// num arquivo, para a tela de contagem abrir rápido e sem gastar cota.

import "server-only";
import { get, put } from "@/lib/loja";
import { ErroTakeat, takeatGet } from "@/lib/takeat/cliente";
import { categoriaPeloNome, type ItemContagem } from "./categorias";
import type { Ajustes } from "./armazem";

export type Insumo = { id: number; nome: string; unidade: string; saldo: number; custo: number };

type Bruto = {
  id: number;
  name: string;
  unidade?: string;
  quantidade?: string | number;
  unitary_price?: string | number;
};

const ARQUIVO = process.env.NODE_ENV === "production" ? "takeat/insumos.json" : "takeat-teste/insumos.json";
const VALIDADE = 2 * 60_000;

async function buscarTodos(): Promise<Insumo[]> {
  const todos: Insumo[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    // contrato ManagedInventoryPage: { items, total, count, remaining, offset, limit }
    const corpo = await takeatGet<{ items?: Bruto[]; remaining?: number }>("/v1/inventory/inputs", { offset });
    if (!Array.isArray(corpo.items)) throw new ErroTakeat("A Takeat devolveu os insumos num formato inesperado.");
    const pagina = corpo.items;
    for (const b of pagina)
      todos.push({
        id: b.id,
        nome: b.name.trim(),
        unidade: (b.unidade ?? "").toUpperCase(),
        saldo: Number(b.quantidade) || 0,
        custo: Number(b.unitary_price) || 0,
      });
    if (!corpo.remaining || pagina.length === 0) break;
  }
  return todos;
}

/** Insumos da Takeat (do arquivo, se for recente). `fresco` força ler da Takeat. */
export async function lerInsumos(fresco = false): Promise<{ em: string; insumos: Insumo[] }> {
  if (!fresco) {
    try {
      const res = await get(ARQUIVO, { access: "private", useCache: false });
      if (res && res.statusCode === 200 && res.stream) {
        const guardado = (await new Response(res.stream).json()) as { em: string; insumos: Insumo[] };
        if (Date.now() - new Date(guardado.em).getTime() < VALIDADE) return guardado;
      }
    } catch {
      /* lê da Takeat */
    }
  }
  const novo = { em: new Date().toISOString(), insumos: await buscarTodos() };
  await put(ARQUIVO, JSON.stringify(novo), { access: "private", contentType: "application/json", allowOverwrite: true });
  return novo;
}

/** Os itens da contagem: insumos da Takeat com a categoria (ajustada ou pelo nome). */
export function itensDaContagem(insumos: Insumo[], ajustes: Ajustes, incluirOcultos = false): ItemContagem[] {
  return insumos
    .filter((i) => incluirOcultos || !ajustes[i.id]?.naoContar)
    .map((i) => ({
      id: i.id,
      nome: i.nome,
      unidade: i.unidade,
      categoria: ajustes[i.id]?.categoria ?? categoriaPeloNome(i.nome),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
