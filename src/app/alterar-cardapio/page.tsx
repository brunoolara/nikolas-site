// Seletor: qual peça o funcionário vai editar.

import Link from "next/link";
import { lerCardapio } from "@/lib/menu/armazem";
import { PECAS, ROTULO_PECA } from "@/lib/menu/tipos";
import Sair from "@/components/painel/Sair";
import { eMaster } from "@/lib/acessos/sessao";

export default async function EscolherPeca() {
  const [cardapio, master] = await Promise.all([lerCardapio(), eMaster()]);
  const quando = new Date(cardapio.atualizadoEm).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-linha pb-4">
        <div>
          <Link href="/" className="text-sm text-cafe underline">
            ← Painel
          </Link>
          <h1 className="font-display text-3xl">Cardápio do Nikola&apos;s</h1>
          <p className="mt-1 text-sm text-cafe">
            Última alteração por {cardapio.atualizadoPor} em {quando}
          </p>
        </div>
        <Sair />
      </header>

      <p className="mt-8 text-cafe">Escolha o que você quer editar ou imprimir:</p>

      <div className="mt-4 grid gap-3">
        {PECAS.map((peca) => {
          const r = ROTULO_PECA[peca];
          return (
            <div key={peca} className="rounded border border-linha p-5 hover:border-verde">
              <h2 className="font-display text-2xl">{r.nome}</h2>
              <p className="mt-1 text-sm text-cafe">{r.descricao}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/alterar-cardapio/${peca}`}
                  className="rounded bg-verde px-4 py-2 text-sm font-semibold text-papel hover:bg-verde-escuro"
                >
                  Editar
                </Link>
                <a
                  href={r.imprimir}
                  target="_blank"
                  className="rounded border border-verde px-4 py-2 text-sm font-semibold text-verde hover:bg-verde hover:text-papel"
                >
                  Ver e imprimir
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {master ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-linha p-5 hover:border-verde">
            <h2 className="font-display text-2xl">Posts do status</h2>
            <p className="mt-1 text-sm text-cafe">Fotos para a equipe postar no status do WhatsApp.</p>
            <Link
              href="/posts"
              className="mt-4 inline-block rounded bg-verde px-4 py-2 text-sm font-semibold text-papel hover:bg-verde-escuro"
            >
              Abrir posts
            </Link>
          </div>
          <div className="rounded border border-linha p-5 hover:border-verde">
            <h2 className="font-display text-2xl">Acessos</h2>
            <p className="mt-1 text-sm text-cafe">Cadastro dos funcionários, senhas e o que cada um acessa.</p>
            <Link
              href="/acessos"
              className="mt-4 inline-block rounded bg-verde px-4 py-2 text-sm font-semibold text-papel hover:bg-verde-escuro"
            >
              Abrir acessos
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
