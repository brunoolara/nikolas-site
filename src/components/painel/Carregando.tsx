"use client";

// O que aparece no instante do toque, enquanto o servidor monta a próxima
// tela (pedido de 13/11/2026: o app parecia não responder ao clique). Sem
// isto o Next só troca de tela quando a página inteira chega.
//
// - Dentro de uma área (ex.: Caixinha → Equipe) a moldura já está na tela:
//   aparecem só os blocos do conteúdo.
// - Ao trocar de área a moldura também é refeita, então `moldura` desenha a
//   barra de cima e a de baixo iguais às de verdade, com o botão tocado já
//   marcado.

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import Logo from "@/components/Logo";
import Icone from "./Icone";
import BarraInferior from "./BarraInferior";

const INTERNAS = [
  "/alterar-cardapio",
  "/posts",
  "/caixinha",
  "/minha-caixinha",
  "/caixinha-turno",
  "/operacao",
  "/estoque",
  "/cmv",
  "/acessos",
  "/imprimir",
  "/avisos",
  "/perfil",
  "/painel",
];
const dentro = (caminho: string, raiz: string) => caminho === raiz || caminho.startsWith(`${raiz}/`);

const semAssinatura = () => () => {};
/** No painel (subdomínio painel. ou rota interna)? No servidor ainda não dá para saber pelo endereço. */
function useNoPainel(caminho: string): boolean {
  const host = useSyncExternalStore(
    semAssinatura,
    () => window.location.hostname,
    () => "",
  );
  return host.startsWith("painel.") || INTERNAS.some((r) => dentro(caminho, r));
}

function secaoDe(caminho: string): string {
  if (caminho === "/" || caminho === "/painel") return "inicio";
  for (const s of ["operacao", "avisos", "perfil"]) if (dentro(caminho, `/${s}`)) return s;
  return "";
}

/** Os blocos cinza no lugar do conteúdo. */
export function Blocos() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="p-esqueleto h-9 w-56 max-w-full" />
      <div className="p-esqueleto mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="p-esqueleto h-36" />
        <div className="p-esqueleto h-36" />
        <div className="p-esqueleto h-24 sm:col-span-2" />
      </div>
    </div>
  );
}

/** A tela inteira de espera, com a moldura (troca de área). Fora do painel não mostra nada. */
export function TelaCarregando() {
  const caminho = usePathname();
  const noPainel = useNoPainel(caminho);
  if (!noPainel) return null;
  return (
    <div className="painel">
      <header className="sticky top-0 z-30 border-b border-linha bg-papel/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 lg:h-auto lg:py-2.5">
          <span className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-tinta lg:hidden" aria-hidden>
            <Icone nome="menu" className="h-6 w-6" />
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="block leading-tight">
              <span className="block font-display text-lg">Nikola&apos;s</span>
              <span className="block text-[11px] uppercase tracking-[0.14em] text-cafe">Painel</span>
            </span>
          </span>
        </div>
      </header>
      <Blocos />
      <BarraInferior
        atual={secaoDe(caminho)}
        segundo={{ chave: "operacao", href: "/operacao", nome: "Ao vivo", icone: "operacao" }}
        atalhos={[]}
        contador={null}
      />
    </div>
  );
}
