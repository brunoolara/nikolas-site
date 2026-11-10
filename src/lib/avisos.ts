// Os avisos do painel: o que está pendente para a pessoa, de acordo com as
// áreas que ela pode abrir. Só lê o que já está guardado no painel (nada da
// Takeat, para não gastar a cota): posts do dia, contagem de estoque e
// fechamento da caixinha.

import "server-only";
import { cache } from "react";
import type { Sessao } from "@/lib/acessos/sessao";
import { lerPosts } from "@/lib/posts/armazem";
import { hoje, rotuloData, somarDias } from "@/lib/posts/tipos";
import { lerContagem } from "@/lib/estoque/armazem";
import { rotuloSemana, semanaDe } from "@/lib/estoque/categorias";
import { lerEstado } from "@/lib/caixinha/armazem";

export type Aviso = {
  chave: string;
  /** "alerta" conta no número do sino; "info" só aparece na lista. */
  tipo: "alerta" | "info";
  titulo: string;
  texto: string;
  href: string;
  acao: string;
};

async function dosPosts(master: boolean): Promise<Aviso[]> {
  const posts = await lerPosts();
  const dia = hoje();
  const avisos: Aviso[] = [];
  const deHoje = posts.filter((p) => p.data === dia);
  const pendentes = deHoje.filter((p) => !p.publicacoes.length);
  if (pendentes.length) {
    avisos.push({
      chave: "posts-hoje",
      tipo: "alerta",
      titulo: pendentes.length === 1 ? "Post de hoje para compartilhar" : `${pendentes.length} posts de hoje para compartilhar`,
      texto: "Ainda não foram marcados como publicados no status do WhatsApp.",
      href: "/posts",
      acao: "Ver os posts",
    });
  }
  if (master && !posts.some((p) => p.data === somarDias(dia, 1))) {
    avisos.push({
      chave: "posts-amanha",
      tipo: "info",
      titulo: "Nada agendado para amanhã",
      texto: "Escolha um post do banco ou crie um novo para o status de amanhã.",
      href: `/posts?dia=${somarDias(dia, 1)}`,
      acao: "Agendar",
    });
  }
  return avisos;
}

async function doEstoque(): Promise<Aviso[]> {
  const atual = semanaDe(hoje());
  const passada = semanaDe(somarDias(atual, -7));
  const [anterior, agora] = await Promise.all([lerContagem(passada), lerContagem(atual)]);
  const avisos: Aviso[] = [];
  if (Object.keys(anterior.itens).length && !anterior.fechada) {
    avisos.push({
      chave: "estoque-passada",
      tipo: "alerta",
      titulo: "Contagem da semana passada aberta",
      texto: `A contagem de ${rotuloSemana(passada)} foi começada e não foi fechada.`,
      href: `/estoque?semana=${passada}`,
      acao: "Fechar a contagem",
    });
  }
  if (!agora.fechada) {
    const n = Object.keys(agora.itens).length;
    avisos.push({
      chave: "estoque-atual",
      tipo: "info",
      titulo: n ? `Contagem da semana: ${n} itens lançados` : "Contagem da semana ainda não começou",
      texto: `Semana de ${rotuloSemana(atual)}.`,
      href: "/estoque",
      acao: n ? "Continuar" : "Começar",
    });
  }
  return avisos;
}

async function daCaixinha(): Promise<Aviso[]> {
  const { ultimoFechado } = await lerEstado();
  const ontem = somarDias(hoje(), -1);
  if (!ultimoFechado || ultimoFechado >= ontem) return [];
  const desde = somarDias(ultimoFechado, 1);
  return [
    {
      chave: "caixinha-aberta",
      tipo: "alerta",
      titulo: "Caixinha sem fechar",
      texto: `Os dias desde ${rotuloData(desde)} ainda não foram fechados.`,
      href: `/caixinha/pagamento?ini=${desde}&fim=${ontem}`,
      acao: "Pagar o período",
    },
  ];
}

/** Os avisos da pessoa, os alertas primeiro. Uma leitura por requisição. */
export const avisosDe = cache(async (sessao: Sessao): Promise<Aviso[]> => {
  const partes = await Promise.all([
    sessao.areas.includes("posts") ? dosPosts(sessao.master) : [],
    sessao.areas.includes("estoque") ? doEstoque() : [],
    sessao.areas.includes("caixinha") ? daCaixinha() : [],
  ]);
  const todos = partes.flat();
  return [...todos.filter((a) => a.tipo === "alerta"), ...todos.filter((a) => a.tipo === "info")];
});
