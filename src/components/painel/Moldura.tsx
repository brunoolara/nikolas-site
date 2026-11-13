// A moldura de todas as telas do painel.
//
// No computador: a barra de cima com a marca, as áreas que a pessoa pode
// abrir (a atual marcada), o sino dos avisos, o nome (vai para o perfil) e Sair.
// No celular, como um aplicativo: em cima o ☰ ao lado do N abre o menu lateral
// com todas as áreas; embaixo ficam fixos os cinco botões do dia a dia
// (Início, Ao vivo, Criar, Avisos e Perfil).

import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { sessaoAtual, type Sessao } from "@/lib/acessos/sessao";
import type { Area } from "@/lib/acessos/areas";
import { avisosDe } from "@/lib/avisos";
import Icone, { type NomeIcone } from "./Icone";
import Sair from "./Sair";
import MenuLateral from "./MenuLateral";
import BarraInferior, { type Atalho } from "./BarraInferior";

export type Secao = "inicio" | Area | "cmv" | "acessos" | "avisos" | "perfil";

type Item = { chave: Secao; href: string; nome: string; icone: NomeIcone; area?: Area; master?: boolean };

export const ITENS: Item[] = [
  { chave: "inicio", href: "/", nome: "Início", icone: "inicio" },
  { chave: "cardapio", href: "/alterar-cardapio", nome: "Cardápio", icone: "cardapio", area: "cardapio" },
  { chave: "posts", href: "/posts", nome: "Posts", icone: "posts", area: "posts" },
  { chave: "operacao", href: "/operacao", nome: "Ao vivo", icone: "operacao", area: "operacao" },
  { chave: "caixinha", href: "/caixinha", nome: "Caixinha", icone: "caixinha", area: "caixinha" },
  {
    chave: "caixinha-turno",
    href: "/caixinha-turno",
    nome: "Turno",
    icone: "caixinha",
    area: "caixinha-turno",
  },
  {
    chave: "minha-caixinha",
    href: "/minha-caixinha",
    nome: "Minha caixinha",
    icone: "caixinha",
    area: "minha-caixinha",
  },
  { chave: "estoque", href: "/estoque", nome: "Estoque", icone: "estoque", area: "estoque" },
  { chave: "cmv", href: "/cmv", nome: "CMV", icone: "cmv", master: true },
  { chave: "acessos", href: "/acessos", nome: "Acessos", icone: "acessos", master: true },
];

function atalhosDe(sessao: Sessao): Atalho[] {
  const a: Atalho[] = [];
  if (sessao.areas.includes("estoque"))
    a.push({ href: "/estoque", nome: "Lançar estoque", descricao: "A contagem desta semana", icone: "estoque" });
  if (sessao.areas.includes("caixinha"))
    a.push({
      href: "/caixinha#consumo",
      nome: "Lançar consumo",
      descricao: "O que alguém da equipe consumiu hoje",
      icone: "caixinha",
    });
  if (sessao.master)
    a.push({ href: "/posts/novo", nome: "Novo post", descricao: "Para o status do WhatsApp", icone: "posts" });
  return a;
}

/** O número de alertas no sino. Vem depois do resto, para não atrasar a página. */
async function Contador({ sessao }: { sessao: Sessao }) {
  const n = (await avisosDe(sessao)).filter((a) => a.tipo === "alerta").length;
  if (!n) return null;
  return (
    <span className="p-contador" aria-label={`${n} ${n === 1 ? "aviso" : "avisos"}`}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

export default async function Moldura({ atual }: { atual: Secao }) {
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  const itens = ITENS.filter((i) => (i.master ? sessao.master : i.area ? sessao.areas.includes(i.area) : true));
  const segundo = itens.find((i) => i.chave === "operacao") ?? itens.find((i) => i.chave !== "inicio") ?? itens[0];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-linha bg-papel/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 lg:h-auto lg:gap-3 lg:py-2.5">
          <MenuLateral
            itens={itens.map(({ chave, href, nome, icone }) => ({ chave, href, nome, icone }))}
            atual={atual}
            nome={sessao.nome}
          />
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md" aria-label="Início do painel">
            <Logo className="h-8 w-8" />
            <span className="block leading-tight">
              <span className="block font-display text-lg">Nikola&apos;s</span>
              <span className="block text-[11px] uppercase tracking-[0.14em] text-cafe">Painel</span>
            </span>
          </Link>

          <nav className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Áreas do painel">
            {itens.map((i) => (
              <LinkArea key={i.chave} item={i} ativo={i.chave === atual} />
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Link
              href="/avisos"
              aria-current={atual === "avisos" ? "page" : undefined}
              className="relative flex h-10 w-10 items-center justify-center rounded-md text-cafe hover:bg-creme hover:text-tinta aria-[current=page]:bg-verde aria-[current=page]:text-papel"
              aria-label="Avisos"
            >
              <Icone nome="sino" className="h-5 w-5" />
              <Suspense fallback={null}>
                <Contador sessao={sessao} />
              </Suspense>
            </Link>
            <Link
              href="/perfil"
              aria-current={atual === "perfil" ? "page" : undefined}
              className="rounded-md px-2 py-2 text-sm text-cafe hover:bg-creme hover:text-tinta aria-[current=page]:font-semibold aria-[current=page]:text-verde"
            >
              {sessao.nome}
            </Link>
            <Sair />
          </div>
        </div>
      </header>

      <BarraInferior
        atual={atual}
        segundo={{ chave: segundo.chave, href: segundo.href, nome: segundo.nome, icone: segundo.icone }}
        atalhos={atalhosDe(sessao)}
        contador={
          <Suspense fallback={null}>
            <Contador sessao={sessao} />
          </Suspense>
        }
      />
    </>
  );
}

function LinkArea({ item, ativo }: { item: Item; ativo: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold ${
        ativo ? "bg-verde text-papel" : "text-cafe hover:bg-creme hover:text-tinta"
      }`}
    >
      <Icone nome={item.icone} className="h-4 w-4" />
      {item.nome}
    </Link>
  );
}
