// Notificações no celular (Web Push): quem se inscreveu, o que cada pessoa
// quer receber e o que já foi avisado. Tudo na loja privada do site.
//
// - notificacoes/inscricoes.json: um aparelho por linha (a mesma pessoa pode
//   ter celular e computador).
// - notificacoes/preferencias.json: por usuário, quais avisos estão ligados.
// - notificacoes/delivery.json: os pedidos já avisados, para não repetir.
//
// Toda gravação relê o arquivo e regrava com ifMatch (etag forte), como na
// Caixinha e no Estoque.

import "server-only";
import { get, put } from "@vercel/blob";
import { forte } from "@/lib/etag";

const PASTA = process.env.NODE_ENV === "production" ? "notificacoes" : "notificacoes-teste";

export type Inscricao = {
  usuario: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** Texto curto para a pessoa reconhecer o aparelho ("iPhone", "Android"...). */
  aparelho: string;
  em: string;
};

/** Os tipos de aviso que a pessoa liga e desliga no Perfil. */
export const TIPOS = {
  deliveryNovo: { nome: "Novo pedido de delivery", descricao: "Assim que um pedido entra na Takeat." },
  deliveryAtrasado: {
    nome: "Delivery atrasado",
    descricao: "Quando um pedido passa de 60 minutos sem sair para entrega.",
  },
} as const;
export type TipoAviso = keyof typeof TIPOS;
export type Preferencias = Record<TipoAviso, boolean>;
export const PREFERENCIAS_PADRAO: Preferencias = { deliveryNovo: true, deliveryAtrasado: true };

export type EstadoDelivery = {
  /** Pedidos já vistos (avisados como novos ou já existentes na primeira leitura). */
  vistos: number[];
  /** Pedidos já avisados como atrasados. */
  atrasados: number[];
  em: string;
};

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
      if (tentativa >= 3) throw erro;
    }
  }
}

const INSCRICOES = `${PASTA}/inscricoes.json`;
const PREFERENCIAS = `${PASTA}/preferencias.json`;
const DELIVERY = `${PASTA}/delivery.json`;

export async function lerInscricoes(): Promise<Inscricao[]> {
  return (await ler<Inscricao[]>(INSCRICOES)).valor ?? [];
}

export function atualizarInscricoes(mudar: (lista: Inscricao[]) => Inscricao[]) {
  return atualizar<Inscricao[]>(INSCRICOES, () => [], mudar);
}

export async function lerPreferencias(): Promise<Record<string, Preferencias>> {
  return (await ler<Record<string, Preferencias>>(PREFERENCIAS)).valor ?? {};
}

export function atualizarPreferencias(mudar: (p: Record<string, Preferencias>) => Record<string, Preferencias>) {
  return atualizar<Record<string, Preferencias>>(PREFERENCIAS, () => ({}), mudar);
}

export async function lerEstadoDelivery(): Promise<EstadoDelivery | null> {
  return (await ler<EstadoDelivery>(DELIVERY)).valor;
}

export function gravarEstadoDelivery(estado: EstadoDelivery) {
  return atualizar<EstadoDelivery>(DELIVERY, () => estado, () => estado);
}
