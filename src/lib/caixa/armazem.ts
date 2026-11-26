// Os fechamentos de caixa lidos dos e-mails da Takeat, na loja privada do
// painel: um arquivo por mês do fechamento (caixa/AAAA-MM.json). E-mail que
// não deu para ler também fica guardado, com o motivo, para aparecer na tela
// em vez de sumir.

import "server-only";
import { get, put } from "@/lib/loja";
import { forte } from "@/lib/etag";
import type { Fechamento } from "./email";

const PASTA = process.env.NODE_ENV === "production" ? "caixa" : "caixa-teste";

export type Ilegivel = { id: string; ilegivel: true; assunto: string; erro: string; recebido: string };
export type Registro = Fechamento | Ilegivel;

export const ehIlegivel = (r: Registro): r is Ilegivel => "ilegivel" in r;

const arquivo = (mes: string) => `${PASTA}/${mes}.json`;

async function lerArquivo(caminho: string): Promise<{ lista: Registro[]; etag?: string }> {
  const res = await get(caminho, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { lista: [] };
  return { lista: (await new Response(res.stream).json()) as Registro[], etag: forte(res.blob.etag) };
}

/**
 * Guarda no mês `mes` (AAAA-MM). Devolve false se esse e-mail já estava lá.
 * Relê e regrava com ifMatch: duas gravações ao mesmo tempo não se apagam.
 */
export async function guardar(mes: string, registro: Registro): Promise<boolean> {
  const caminho = arquivo(mes);
  for (let tentativa = 0; ; tentativa++) {
    const { lista, etag } = await lerArquivo(caminho);
    if (lista.some((r) => r.id === registro.id)) return false;
    try {
      await put(caminho, JSON.stringify([...lista, registro]), {
        access: "private",
        contentType: "application/json",
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
      });
      return true;
    } catch (erro) {
      if (tentativa >= 3) throw erro;
    }
  }
}

/** Os registros dos meses pedidos, do fechamento mais novo para o mais velho. */
export async function lerMeses(meses: string[]): Promise<Registro[]> {
  const partes = await Promise.all(meses.map((m) => lerArquivo(arquivo(m)).then((r) => r.lista)));
  const quando = (r: Registro) => (ehIlegivel(r) ? r.recebido : r.fechado);
  return partes.flat().sort((a, b) => quando(b).localeCompare(quando(a)));
}
