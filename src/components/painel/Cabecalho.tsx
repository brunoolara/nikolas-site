// Cabeçalho de página do painel: caminho de volta, título, uma linha de
// explicação e as ações da própria página (ver e imprimir, novo post...).
// A navegação entre áreas fica na Moldura, não aqui.

import Link from "next/link";
import Icone from "./Icone";

type Props = {
  titulo: string;
  descricao?: React.ReactNode;
  voltar?: { href: string; rotulo: string };
  acoes?: React.ReactNode;
};

export default function Cabecalho({ titulo, descricao, voltar, acoes }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {voltar ? (
          <Link
            href={voltar.href}
            className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-cafe hover:text-verde"
          >
            <Icone nome="voltar" className="h-3.5 w-3.5" />
            {voltar.rotulo}
          </Link>
        ) : null}
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">{titulo}</h1>
        {descricao ? <p className="mt-1.5 max-w-prose text-sm text-cafe sm:text-base">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  );
}
