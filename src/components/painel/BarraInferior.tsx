"use client";

// O rodapé do celular: cinco botões fixos para o dia a dia — Início, Ao vivo
// (ou a primeira área da pessoa, se ela não tem o Ao vivo), Criar no meio,
// Avisos e Perfil. O Criar abre, de baixo para cima, os atalhos que a pessoa
// pode usar.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Icone, { type NomeIcone } from "./Icone";

export type Atalho = {
  href: string;
  nome: string;
  descricao: string;
  icone: NomeIcone;
};
type Botao = { chave: string; href: string; nome: string; icone: NomeIcone };

type Props = {
  atual: string;
  segundo: Botao;
  atalhos: Atalho[];
  /** O número de avisos, que chega depois (não segura a página). */
  contador: React.ReactNode;
};

export default function BarraInferior({
  atual,
  segundo,
  atalhos,
  contador,
}: Props) {
  const janela = useRef<HTMLDialogElement>(null);
  const caminho = usePathname();

  useEffect(() => {
    janela.current?.close();
  }, [caminho]);

  const botoes: (Botao | "criar")[] = [
    { chave: "inicio", href: "/", nome: "Início", icone: "inicio" },
    segundo,
    "criar",
    { chave: "avisos", href: "/avisos", nome: "Avisos", icone: "sino" },
    { chave: "perfil", href: "/perfil", nome: "Perfil", icone: "perfil" },
  ];

  return (
    <>
      <nav className="p-barra lg:hidden" aria-label="Atalhos do dia a dia">
        {botoes.map((b) =>
          b === "criar" ? (
            <button
              key="criar"
              type="button"
              onClick={() => janela.current?.showModal()}
              className="p-barra-item"
              aria-haspopup="dialog"
              aria-label="Criar"
            >
              <span className="p-barra-criar">
                <Icone nome="mais" className="h-6 w-6" />
              </span>
            </button>
          ) : (
            <Link
              key={b.chave}
              href={b.href}
              aria-current={b.chave === atual ? "page" : undefined}
              className="p-barra-item"
            >
              <span className="relative">
                <Icone nome={b.icone} className="h-6 w-6" />
                {b.chave === "avisos" ? contador : null}
              </span>
              {b.nome}
            </Link>
          ),
        )}
      </nav>

      <dialog
        ref={janela}
        autoFocus
        className="p-folha"
        aria-label="Criar"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        {/* o espaçamento fica aqui dentro: um toque nele não conta como "fora" */}
        <div className="p-folha-corpo">
          <div
            className="mx-auto mb-1 h-1 w-10 rounded-full bg-linha"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between px-1 pb-2 pt-1">
            <h2 className="font-display text-xl">Criar</h2>
            <button
              type="button"
              onClick={() => janela.current?.close()}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--p-raio-sm)] text-cafe hover:bg-creme"
              aria-label="Fechar"
            >
              <Icone nome="fechar" className="h-5 w-5" />
            </button>
          </div>
          {atalhos.length ? (
            <ul className="space-y-1">
              {atalhos.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    onClick={() => janela.current?.close()}
                    className="flex min-h-14 items-center gap-3 rounded-[var(--p-raio-sm)] px-2 py-2 hover:bg-creme"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--p-verde-fundo)] text-verde">
                      <Icone nome={a.icone} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{a.nome}</span>
                      <span className="block text-sm text-cafe">
                        {a.descricao}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 pb-2 text-sm text-cafe">
              Seu acesso não tem nada para criar por aqui.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
