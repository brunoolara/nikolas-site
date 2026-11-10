"use client";

// O botão ☰ ao lado do N e o menu que ele abre pela esquerda, com todas as
// áreas que a pessoa pode abrir. Usa <dialog>: o Esc fecha, o foco fica dentro
// e o resto da tela não recebe toque enquanto está aberto.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Icone, { type NomeIcone } from "./Icone";
import { acaoSair } from "@/lib/acessos/acoes";

export type ItemMenu = { chave: string; href: string; nome: string; icone: NomeIcone };

export default function MenuLateral({ itens, atual, nome }: { itens: ItemMenu[]; atual: string; nome: string }) {
  const janela = useRef<HTMLDialogElement>(null);
  const caminho = usePathname();

  // trocou de página pelo menu: fecha
  useEffect(() => {
    janela.current?.close();
  }, [caminho]);

  return (
    <>
      <button
        type="button"
        onClick={() => janela.current?.showModal()}
        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--p-raio-sm)] text-tinta hover:bg-creme lg:hidden"
        aria-label="Abrir o menu"
      >
        <Icone nome="menu" className="h-6 w-6" />
      </button>

      <dialog
        ref={janela}
        autoFocus
        className="p-gaveta"
        aria-label="Menu do painel"
        onClick={(e) => {
          // toque fora do painel (no fundo escurecido) fecha
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-linha px-4 py-3">
            <div>
              <p className="font-display text-xl">Nikola&apos;s</p>
              <p className="text-sm text-cafe">{nome}</p>
            </div>
            <button
              type="button"
              onClick={() => janela.current?.close()}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--p-raio-sm)] text-cafe hover:bg-creme"
              aria-label="Fechar o menu"
            >
              <Icone nome="fechar" className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2" aria-label="Áreas do painel">
            {itens.map((i) => {
              const ativo = i.chave === atual;
              return (
                <Link
                  key={i.chave}
                  href={i.href}
                  aria-current={ativo ? "page" : undefined}
                  onClick={() => janela.current?.close()}
                  className={`flex min-h-12 items-center gap-3 rounded-[var(--p-raio-sm)] px-3 text-[15px] font-semibold ${
                    ativo ? "bg-verde text-papel" : "text-tinta hover:bg-creme"
                  }`}
                >
                  <Icone nome={i.icone} className="h-5 w-5" />
                  {i.nome}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-linha p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => acaoSair()} className="p-btn p-btn-secundario w-full">
              Sair
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
