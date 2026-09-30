// Onde o cardápio mora: um único arquivo JSON no Vercel Blob (loja privada
// "cardapio-nikolas"). Banco de dados seria canhão para matar mosquito — é um
// documento de poucos kilobytes, editado por uma pessoa, uma vez por semana.
//
// Privado de propósito: o arquivo guarda preços, e o site público não mostra
// preço. Toda leitura passa pelo nosso servidor.
//
// Cada gravação também deixa uma cópia datada em historico/, o que dá
// "voltar para a semana passada" de graça.

import "server-only";
import { get, list, put } from "@vercel/blob";
import { CARDAPIO_INICIAL } from "./inicial";
import type { Cardapio } from "./tipos";

const ATUAL = "cardapio/atual.json";
const HISTORICO = "cardapio/historico";

function semToken(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN;
}

/**
 * Lê o cardápio. Se ainda não existe arquivo (ou não há credencial, como numa
 * build sem env), devolve a carga inicial — a página de impressão nunca quebra.
 */
export async function lerCardapio(): Promise<Cardapio> {
  if (semToken()) return CARDAPIO_INICIAL;
  try {
    // useCache: false para o funcionário ver na hora o que acabou de salvar.
    const res = await get(ATUAL, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return CARDAPIO_INICIAL;
    const guardado = (await new Response(res.stream).json()) as Partial<Cardapio>;
    return completar(guardado);
  } catch {
    return CARDAPIO_INICIAL;
  }
}

/**
 * Completa o que estiver faltando com a carga inicial.
 * Um arquivo gravado antes de uma peça existir (o salão entrou depois do
 * executivo) não tem aquele campo; sem isto a página de impressão quebraria.
 */
function completar(guardado: Partial<Cardapio>): Cardapio {
  return {
    ...CARDAPIO_INICIAL,
    ...guardado,
    executivo: guardado.executivo ?? CARDAPIO_INICIAL.executivo,
    salao: guardado.salao ?? CARDAPIO_INICIAL.salao,
  };
}

/** Grava o cardápio e guarda uma cópia datada. Devolve o que foi salvo. */
export async function gravarCardapio(
  cardapio: Cardapio,
  autor: string,
): Promise<Cardapio> {
  const agora = new Date();
  const novo: Cardapio = {
    ...cardapio,
    versao: (cardapio.versao ?? 0) + 1,
    atualizadoEm: agora.toISOString(),
    atualizadoPor: autor,
  };
  const corpo = JSON.stringify(novo, null, 2);
  const opcoes = { access: "private", contentType: "application/json" } as const;

  await put(ATUAL, corpo, { ...opcoes, allowOverwrite: true });
  // carimbo de tempo no nome, para a lista do histórico já sair em ordem
  const carimbo = agora.toISOString().replace(/[:.]/g, "-");
  await put(`${HISTORICO}/${carimbo}.json`, corpo, opcoes);
  return novo;
}

export type VersaoGuardada = {
  pathname: string;
  quando: Date;
};

/** Versões anteriores, da mais recente para a mais antiga. */
export async function listarHistorico(limite = 20): Promise<VersaoGuardada[]> {
  if (semToken()) return [];
  try {
    const { blobs } = await list({ prefix: `${HISTORICO}/`, limit: limite });
    return blobs
      .map((b) => ({ pathname: b.pathname, quando: new Date(b.uploadedAt) }))
      .sort((a, b) => b.quando.getTime() - a.quando.getTime());
  } catch {
    return [];
  }
}

/** Carrega uma versão do histórico, para restaurar. */
export async function lerVersao(pathname: string): Promise<Cardapio | null> {
  if (!pathname.startsWith(`${HISTORICO}/`)) return null;   // não sai da pasta
  try {
    const res = await get(pathname, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return (await new Response(res.stream).json()) as Cardapio;
  } catch {
    return null;
  }
}
