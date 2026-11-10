// A barra de cima de todas as telas do painel: marca, as áreas que a pessoa
// pode abrir (com a atual marcada), quem está logado e Sair. Assim dá para
// ir de uma área para outra sem voltar à porta.

import Link from "next/link";
import Logo from "@/components/Logo";
import { sessaoAtual } from "@/lib/acessos/sessao";
import type { Area } from "@/lib/acessos/areas";
import Icone, { type NomeIcone } from "./Icone";
import Sair from "./Sair";
import RolarAtivo from "./RolarAtivo";

export type Secao = "inicio" | Area | "cmv" | "acessos";

type Item = { chave: Secao; href: string; nome: string; icone: NomeIcone; area?: Area; master?: boolean };

export const ITENS: Item[] = [
  { chave: "inicio", href: "/", nome: "Início", icone: "inicio" },
  { chave: "cardapio", href: "/alterar-cardapio", nome: "Cardápio", icone: "cardapio", area: "cardapio" },
  { chave: "posts", href: "/posts", nome: "Posts", icone: "posts", area: "posts" },
  { chave: "operacao", href: "/operacao", nome: "Ao vivo", icone: "operacao", area: "operacao" },
  { chave: "caixinha", href: "/caixinha", nome: "Caixinha", icone: "caixinha", area: "caixinha" },
  { chave: "estoque", href: "/estoque", nome: "Estoque", icone: "estoque", area: "estoque" },
  { chave: "cmv", href: "/cmv", nome: "CMV", icone: "cmv", master: true },
  { chave: "acessos", href: "/acessos", nome: "Acessos", icone: "acessos", master: true },
];

export default async function Moldura({ atual }: { atual: Secao }) {
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  const itens = ITENS.filter((i) => (i.master ? sessao.master : i.area ? sessao.areas.includes(i.area) : true));

  return (
    <header className="sticky top-0 z-30 border-b border-linha bg-papel/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
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

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-cafe lg:inline">{sessao.nome}</span>
          <Sair />
        </div>
      </div>

      {/* no celular as áreas viram abas compactas, ícone sobre o nome, que cabem lado a lado */}
      <nav className="p-rolagem border-t border-linha/70 lg:hidden" aria-label="Áreas do painel">
        <div className="flex gap-1 px-2 py-1.5">
          {itens.map((i) => {
            const ativo = i.chave === atual;
            return (
              <Link
                key={i.chave}
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-w-16 flex-1 shrink-0 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-semibold ${
                  ativo ? "bg-verde text-papel" : "text-cafe active:bg-creme"
                }`}
              >
                <Icone nome={i.icone} className="h-5 w-5" />
                <span className="max-w-full truncate">{i.nome}</span>
              </Link>
            );
          })}
          <RolarAtivo />
        </div>
      </nav>
    </header>
  );
}

function LinkArea({ item, ativo }: { item: Item; ativo: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold transition-colors ${
        ativo ? "bg-verde text-papel" : "text-cafe hover:bg-creme hover:text-tinta"
      }`}
    >
      <Icone nome={item.icone} className="h-4 w-4" />
      {item.nome}
    </Link>
  );
}
