// Registro do painel: quem entrou, quando, e o que mudou no cardápio.
//
// Um JSON por mês na loja privada (registro/AAAA-MM.json). Cada evento é
// acrescentado lendo o arquivo e regravando com ifMatch: se duas pessoas
// gravarem ao mesmo tempo, a segunda relê e tenta de novo, e nenhum evento
// some. Registrar nunca derruba quem chamou — no pior caso o evento se perde.

import "server-only";
import { get, put } from "@vercel/blob";
import { forte } from "@/lib/etag";

export type TipoEvento = "entrou" | "falhou" | "saiu" | "visita" | "cardapio";

export type Evento = {
  /** ISO 8601. */
  quando: string;
  tipo: TipoEvento;
  /** Login usado (na falha, o que foi digitado). */
  usuario: string;
  nome?: string;
  /** visita: a página aberta; cardapio: a peça ("Menu executivo"...). */
  onde?: string;
  /** cardapio: versão gravada. */
  versao?: number;
  /** cardapio: o que mudou, uma linha por alteração. */
  detalhes?: string[];
};

const PASTA = "registro";

function semToken(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN;
}

const arquivoDoMes = (d: Date) => `${PASTA}/${d.toISOString().slice(0, 7)}.json`;

async function lerArquivo(caminho: string): Promise<{ eventos: Evento[]; etag?: string }> {
  const res = await get(caminho, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { eventos: [] };
  return { eventos: (await new Response(res.stream).json()) as Evento[], etag: forte(res.blob.etag) };
}

export async function registrar(evento: Omit<Evento, "quando">): Promise<void> {
  if (semToken()) return;
  const agora = new Date();
  const caminho = arquivoDoMes(agora);
  const novo: Evento = { quando: agora.toISOString(), ...evento };

  for (let tentativa = 0; tentativa < 4; tentativa++) {
    try {
      const { eventos, etag } = await lerArquivo(caminho);
      await put(caminho, JSON.stringify([...eventos, novo]), {
        access: "private",
        contentType: "application/json",
        // arquivo novo: falha se outro criou antes; existente: falha se mudou
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
      });
      return;
    } catch (erro) {
      if (tentativa === 3) console.error("registro: evento perdido", novo, erro);
    }
  }
}

/** Eventos dos últimos `meses` meses (contando o atual), do mais recente para o mais antigo. */
export async function lerRegistro(meses = 3): Promise<Evento[]> {
  if (semToken()) return [];
  const hoje = new Date();
  const caminhos = Array.from({ length: meses }, (_, i) =>
    arquivoDoMes(new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1))),
  );
  const partes = await Promise.all(caminhos.map((c) => lerArquivo(c).catch(() => ({ eventos: [] }))));
  return partes.flatMap((p) => p.eventos).sort((a, b) => b.quando.localeCompare(a.quando));
}
