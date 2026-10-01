"use client";

// Setas para mudar um item de lugar na lista.
//
// Setas e não arrastar de propósito: quem usa isto mexe pelo celular, e
// arrastar em tela de toque erra muito — ainda mais numa lista longa que
// precisa rolar enquanto se arrasta.

/** Devolve a lista com o item de `de` movido para `para`. Fora da faixa, não mexe. */
export function mover<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length || de === para) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

const botao =
  "flex h-[19px] w-7 items-center justify-center rounded border border-linha text-xs text-cafe " +
  "hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

export default function Mover({
  indice,
  total,
  aoMover,
  oQue = "item",
}: {
  indice: number;
  total: number;
  aoMover: (para: number) => void;
  /** Como o item é chamado, para o leitor de tela: "prato", "parágrafo"… */
  oQue?: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-px" aria-label={`Mudar o ${oQue} de lugar`}>
      <button
        type="button"
        className={botao}
        disabled={indice === 0}
        onClick={() => aoMover(indice - 1)}
        title={`Subir este ${oQue}`}
        aria-label={`Subir este ${oQue}`}
      >
        ↑
      </button>
      <button
        type="button"
        className={botao}
        disabled={indice === total - 1}
        onClick={() => aoMover(indice + 1)}
        title={`Descer este ${oQue}`}
        aria-label={`Descer este ${oQue}`}
      >
        ↓
      </button>
    </div>
  );
}
