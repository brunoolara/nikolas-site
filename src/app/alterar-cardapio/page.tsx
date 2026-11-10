// Seletor: qual peça o funcionário vai editar.

import Link from "next/link";
import { lerCardapio } from "@/lib/menu/armazem";
import { PECAS, ROTULO_PECA } from "@/lib/menu/tipos";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";
import { exigir } from "@/lib/acessos/sessao";

export default async function EscolherPeca() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("cardapio")).liberado) return null;
  const cardapio = await lerCardapio();
  const quando = new Date(cardapio.atualizadoEm).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Cardápio"
        descricao={
          <>
            Escolha a peça para editar ou imprimir. Última alteração por {cardapio.atualizadoPor} em {quando}.
          </>
        }
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PECAS.map((peca) => {
          const r = ROTULO_PECA[peca];
          return (
            <section key={peca} className="p-cartao flex flex-col p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-verde/10 text-verde">
                <Icone nome="cardapio" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-2xl">{r.nome}</h2>
              <p className="mt-1 flex-1 text-sm text-cafe">{r.descricao}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/alterar-cardapio/${peca}`} className="p-btn p-btn-primario">
                  Editar
                </Link>
                <a href={r.imprimir} target="_blank" className="p-btn p-btn-secundario">
                  <Icone nome="imprimir" className="h-4 w-4" />
                  Ver e imprimir
                </a>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
