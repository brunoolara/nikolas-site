// Onde a Caixinha mora: na loja privada do site, como o cardápio e os posts.
//
// - caixinha/equipe.json: quem entra no rateio.
// - caixinha/dias/AAAA-MM-DD.json: presenças, taxa digitada, consumos e o
//   fechamento do dia.
// - caixinha/estado.json: saldos negativos, o último dia fechado e a lista
//   de pagamentos.
// - caixinha/pagamentos/INI_FIM.json: um pagamento de um ou mais dias.
//
// Toda gravação relê o arquivo e regrava com ifMatch: se duas pessoas
// mexerem ao mesmo tempo, a segunda relê e aplica a mudança por cima, e
// nada se perde (mesmo esquema do registro do painel).

import "server-only";
import { del, get, put } from "@vercel/blob";
import { forte } from "@/lib/etag";
import { diaVazio, type Dia, type Estado, type Pagamento, type Pessoa } from "./tipos";

// Em desenvolvimento o site usa a mesma loja da Vercel; a pasta separada
// impede que um teste local apareça na caixinha de verdade.
const PASTA = process.env.NODE_ENV === "production" ? "caixinha" : "caixinha-teste";
const EQUIPE = `${PASTA}/equipe.json`;
const ESTADO = `${PASTA}/estado.json`;
const arquivoDia = (data: string) => `${PASTA}/dias/${data}.json`;
const arquivoPagamento = (id: string) => `${PASTA}/pagamentos/${id}.json`;

async function ler<T>(caminho: string): Promise<{ valor: T | null; etag?: string }> {
  const res = await get(caminho, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { valor: null };
  return { valor: (await new Response(res.stream).json()) as T, etag: forte(res.blob.etag) };
}

/** Lê, aplica `mudar` e grava, tentando de novo se alguém gravou no meio. */
async function atualizar<T>(caminho: string, vazio: () => T, mudar: (atual: T) => T): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    const { valor, etag } = await ler<T>(caminho);
    const novo = mudar(valor ?? vazio());
    try {
      await put(caminho, JSON.stringify(novo, null, 2), {
        access: "private",
        contentType: "application/json",
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
      });
      return novo;
    } catch (erro) {
      if (tentativa >= 3) throw erro;
    }
  }
}

export async function lerEquipe(): Promise<Pessoa[]> {
  return (await ler<Pessoa[]>(EQUIPE)).valor ?? [];
}

export function atualizarEquipe(mudar: (equipe: Pessoa[]) => Pessoa[]) {
  return atualizar<Pessoa[]>(EQUIPE, () => [], mudar);
}

export async function lerDia(data: string): Promise<Dia> {
  return (await ler<Dia>(arquivoDia(data))).valor ?? diaVazio(data);
}

export function atualizarDia(data: string, mudar: (dia: Dia) => Dia) {
  return atualizar<Dia>(arquivoDia(data), () => diaVazio(data), mudar);
}

export async function lerEstado(): Promise<Estado> {
  return (await ler<Estado>(ESTADO)).valor ?? { saldos: {}, ultimoFechado: null };
}

export function gravarEstado(estado: Estado) {
  return atualizar<Estado>(ESTADO, () => estado, () => estado);
}

export async function lerPagamento(id: string): Promise<Pagamento | null> {
  return (await ler<Pagamento>(arquivoPagamento(id))).valor;
}

export function gravarPagamento(p: Pagamento) {
  return put(arquivoPagamento(p.id), JSON.stringify(p, null, 2), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export function apagarPagamento(id: string) {
  return del(arquivoPagamento(id));
}
