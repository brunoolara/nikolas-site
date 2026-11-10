// Envia uma notificação para os aparelhos inscritos (Web Push com VAPID).
// As chaves ficam só na Vercel: VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.
// Aparelho que a loja de push diz que não existe mais (404/410) sai da lista.

import "server-only";
import webpush from "web-push";
import { atualizarInscricoes, type Inscricao } from "./armazem";

export type Mensagem = { title: string; body: string; tag: string; url: string };

export const chavePublica = () => process.env.VAPID_PUBLIC_KEY ?? "";

let configurado = false;
function configurar(): boolean {
  if (configurado) return true;
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails("https://painel.nikolasrestaurante.com.br", publica, privada);
  configurado = true;
  return true;
}

export const pushConfigurado = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Manda para cada aparelho; devolve quantos receberam. */
export async function enviar(para: Inscricao[], mensagem: Mensagem): Promise<number> {
  if (!para.length || !configurar()) return 0;
  const corpo = JSON.stringify(mensagem);
  const mortos: string[] = [];
  let ok = 0;
  await Promise.all(
    para.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: i.keys }, corpo, { TTL: 600, urgency: "high" });
        ok++;
      } catch (erro) {
        const status = (erro as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) mortos.push(i.endpoint);
        else console.error("notificacoes: falha ao enviar", status ?? erro);
      }
    }),
  );
  if (mortos.length) await atualizarInscricoes((lista) => lista.filter((x) => !mortos.includes(x.endpoint)));
  return ok;
}
