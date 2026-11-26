// O histórico das notificações, para a tela Avisos (pedido do Bruno em 26/11/2026):
// cada aviso que sai para o celular também fica guardado aqui, para quem devia
// receber, mesmo que a pessoa não tenha o celular inscrito. Um arquivo por mês
// (notificacoes/historico/AAAA-MM.json).
//
// E o "visto": quando a pessoa abre Avisos, guarda a hora e as pendências que
// estavam na tela; o número do sino só conta o que chegou ou apareceu depois.

import "server-only";
import { randomUUID } from "node:crypto";
import { get, put } from "@/lib/loja";
import { forte } from "@/lib/etag";
import type { TipoAviso } from "./armazem";

const PASTA = process.env.NODE_ENV === "production" ? "notificacoes" : "notificacoes-teste";
const VISTOS = `${PASTA}/vistos.json`;
const doMes = (iso: string) => `${PASTA}/historico/${iso.slice(0, 7)}.json`;

export type ItemHistorico = {
  id: string;
  /** ISO 8601. */
  em: string;
  tipo: TipoAviso;
  /** Usuários (login) que deviam receber. */
  para: string[];
  titulo: string;
  texto: string;
  url: string;
};

export type Visto = { em: string; chaves: string[] };

async function ler<T>(caminho: string): Promise<{ valor: T | null; etag?: string }> {
  const res = await get(caminho, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { valor: null };
  return { valor: (await new Response(res.stream).json()) as T, etag: forte(res.blob.etag) };
}

async function atualizar<T>(caminho: string, vazio: T, mudar: (atual: T) => T): Promise<void> {
  for (let tentativa = 0; ; tentativa++) {
    const { valor, etag } = await ler<T>(caminho);
    try {
      await put(caminho, JSON.stringify(mudar(valor ?? vazio)), {
        access: "private",
        contentType: "application/json",
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
      });
      return;
    } catch (erro) {
      if (tentativa >= 3) throw erro;
    }
  }
}

/** Guarda um aviso. Nunca derruba quem chamou: no pior caso o aviso não entra no histórico. */
export async function guardarNoHistorico(item: Omit<ItemHistorico, "id" | "em">): Promise<void> {
  if (!item.para.length) return;
  const em = new Date().toISOString();
  try {
    await atualizar<ItemHistorico[]>(doMes(em), [], (lista) => [...lista, { id: randomUUID(), em, ...item }]);
  } catch (erro) {
    console.error("notificacoes: aviso fora do histórico", item.titulo, erro);
  }
}

/** Os avisos da pessoa nos últimos 30 dias, do mais novo para o mais velho. */
export async function historicoDe(usuario: string, limite = 60): Promise<ItemHistorico[]> {
  const agora = new Date();
  const anterior = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 1, 15)).toISOString();
  const desde = new Date(agora.getTime() - 30 * 86_400_000).toISOString();
  const meses = await Promise.all([doMes(agora.toISOString()), doMes(anterior)].map((c) => ler<ItemHistorico[]>(c)));
  return meses
    .flatMap((m) => m.valor ?? [])
    .filter((i) => i.para.includes(usuario) && i.em >= desde)
    .sort((a, b) => b.em.localeCompare(a.em))
    .slice(0, limite);
}

export async function vistoDe(usuario: string): Promise<Visto | null> {
  return (await ler<Record<string, Visto>>(VISTOS)).valor?.[usuario] ?? null;
}

/** A pessoa abriu Avisos: o sino zera até chegar algo novo. */
export function marcarVisto(usuario: string, chaves: string[]) {
  return atualizar<Record<string, Visto>>(VISTOS, {}, (v) => ({
    ...v,
    [usuario]: { em: new Date().toISOString(), chaves },
  }));
}
