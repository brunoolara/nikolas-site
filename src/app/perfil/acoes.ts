"use server";

// Inscrição deste aparelho nas notificações, as preferências da pessoa e o
// envio de um teste. Cada pessoa só mexe nas suas.

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/acessos/sessao";
import {
  PREFERENCIAS_PADRAO,
  TIPOS,
  atualizarInscricoes,
  atualizarPreferencias,
  lerInscricoes,
  type TipoAviso,
} from "@/lib/notificacoes/armazem";
import { enviar } from "@/lib/notificacoes/enviar";

type Resposta = { ok: boolean; mensagem: string };
type Assinatura = { endpoint: string; keys: { p256dh: string; auth: string } };

const valida = (s: Assinatura) =>
  typeof s?.endpoint === "string" &&
  s.endpoint.startsWith("https://") &&
  s.endpoint.length < 1000 &&
  typeof s.keys?.p256dh === "string" &&
  typeof s.keys?.auth === "string";

export async function acaoInscrever(assinatura: Assinatura, aparelho: string): Promise<Resposta> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, mensagem: "Entre de novo no painel." };
  if (!valida(assinatura)) return { ok: false, mensagem: "O aparelho mandou uma inscrição inválida." };
  await atualizarInscricoes((lista) => [
    ...lista.filter((i) => i.endpoint !== assinatura.endpoint),
    {
      usuario: sessao.usuario,
      endpoint: assinatura.endpoint,
      keys: { p256dh: assinatura.keys.p256dh, auth: assinatura.keys.auth },
      aparelho: aparelho.slice(0, 40) || "Aparelho",
      em: new Date().toISOString(),
    },
  ]);
  revalidatePath("/perfil");
  return { ok: true, mensagem: "Notificações ativadas neste aparelho." };
}

export async function acaoDesinscrever(endpoint: string): Promise<Resposta> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, mensagem: "Entre de novo no painel." };
  await atualizarInscricoes((lista) =>
    lista.filter((i) => !(i.endpoint === endpoint && i.usuario === sessao.usuario)),
  );
  revalidatePath("/perfil");
  return { ok: true, mensagem: "Notificações desativadas neste aparelho." };
}

export async function acaoPreferencia(tipo: TipoAviso, ligado: boolean): Promise<Resposta> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, mensagem: "Entre de novo no painel." };
  if (!(tipo in TIPOS)) return { ok: false, mensagem: "Aviso desconhecido." };
  await atualizarPreferencias((p) => ({
    ...p,
    [sessao.usuario]: { ...PREFERENCIAS_PADRAO, ...p[sessao.usuario], [tipo]: Boolean(ligado) },
  }));
  revalidatePath("/perfil");
  return { ok: true, mensagem: ligado ? "Aviso ligado." : "Aviso desligado." };
}

export async function acaoTestar(): Promise<Resposta> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, mensagem: "Entre de novo no painel." };
  const meus = (await lerInscricoes()).filter((i) => i.usuario === sessao.usuario);
  if (!meus.length) return { ok: false, mensagem: "Nenhum aparelho seu está inscrito." };
  const n = await enviar(meus, {
    title: "Teste do painel",
    body: "Se você está vendo isto, as notificações do Nikola's chegam neste aparelho.",
    tag: "teste",
    url: "/perfil",
  });
  return n
    ? { ok: true, mensagem: n === 1 ? "Teste enviado." : `Teste enviado para ${n} aparelhos.` }
    : { ok: false, mensagem: "Não consegui enviar. Confira se as notificações estão permitidas no aparelho." };
}
