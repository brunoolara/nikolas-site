"use server";

// Inscrição deste aparelho nas notificações, as preferências da pessoa e o
// envio de um teste. Cada pessoa só mexe nas suas.

import { revalidatePath } from "next/cache";
import { sessaoAtual, trocarMinhaSenha } from "@/lib/acessos/sessao";
import { gravarUsuarios, lerUsuarios } from "@/lib/acessos/usuarios";
import { celularValido, cpfValido, soDigitos } from "@/lib/acessos/dados";
import {
  PREFERENCIAS_PADRAO,
  TIPOS,
  atualizarInscricoes,
  atualizarPreferencias,
  lerInscricoes,
  type TipoAviso,
} from "@/lib/notificacoes/armazem";
import { enviar } from "@/lib/notificacoes/enviar";
import { after } from "next/server";
import { gravarPixDe } from "@/lib/caixinha/armazem";
import { conferirChavePix, resumoChave } from "@/lib/caixinha/pix";
import { registrar } from "@/lib/registro";

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

/**
 * A própria chave Pix da caixinha (tipo null tira). Só para login ligado a
 * alguém da equipe; fica no registro do painel (tipo e final da chave).
 */
export async function acaoMinhaChavePix(tipo: string | null, chave: string): Promise<Resposta> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, mensagem: "Entre de novo no painel." };
  if (!sessao.pessoa)
    return { ok: false, mensagem: "Seu login não está ligado a ninguém da equipe da Caixinha. Fale com o Bruno." };
  const r = tipo === null ? null : conferirChavePix(tipo, chave);
  if (r && !r.ok) return { ok: false, mensagem: r.erro };
  try {
    if (!(await gravarPixDe(sessao.pessoa, r ? r.pix : null, sessao.nome)))
      return { ok: false, mensagem: "Não achei você na equipe da Caixinha. Fale com o Bruno." };
  } catch (erro) {
    console.error("perfil: falha ao gravar a chave Pix", erro);
    return { ok: false, mensagem: "Não consegui gravar. Tente de novo em instantes." };
  }
  after(() =>
    registrar({
      tipo: "pix",
      usuario: sessao.usuario,
      nome: sessao.nome,
      onde: r ? `cadastrou a própria chave Pix (${resumoChave(r.pix)})` : "tirou a própria chave Pix",
    }),
  );
  revalidatePath("/perfil");
  revalidatePath("/caixinha", "layout");
  return { ok: true, mensagem: r ? "Chave Pix salva." : "Chave Pix tirada." };
}

/** A própria senha: confere a atual e grava a nova (6 números). */
export async function acaoMinhaSenha(atual: string, nova: string): Promise<Resposta> {
  const erro = await trocarMinhaSenha(atual, nova);
  if (erro) return { ok: false, mensagem: erro };
  return { ok: true, mensagem: "Senha trocada. Nos outros aparelhos, entre de novo com a senha nova." };
}

/** CPF e celular da própria pessoa; os dois são opcionais (vazio apaga). */
export async function acaoMeusDados(cpf: string, celular: string): Promise<Resposta> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, mensagem: "Entre de novo no painel." };
  if (sessao.master) return { ok: false, mensagem: "O master não tem cadastro aqui." };
  const c = soDigitos(cpf);
  const cel = soDigitos(celular);
  if (c && !cpfValido(c)) return { ok: false, mensagem: "Esse CPF não confere. Confira os números." };
  if (cel && !celularValido(cel)) return { ok: false, mensagem: "Coloque o celular com DDD, por exemplo (35) 99999-9999." };

  const usuarios = await lerUsuarios();
  const u = usuarios.find((x) => x.usuario === sessao.usuario);
  if (!u) return { ok: false, mensagem: "Entre de novo no painel." };
  const novo = { ...u };
  if (c) novo.cpf = c;
  else delete novo.cpf;
  if (cel) novo.celular = cel;
  else delete novo.celular;
  await gravarUsuarios(usuarios.map((x) => (x.usuario === u.usuario ? novo : x)));
  revalidatePath("/perfil");
  revalidatePath("/acessos");
  return { ok: true, mensagem: "Dados salvos." };
}
