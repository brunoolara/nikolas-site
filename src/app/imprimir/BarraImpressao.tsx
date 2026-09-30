"use client";

// Barra que só existe na tela. Some na impressão (classe .so-tela).
export default function BarraImpressao({ voltarPara = "/admin" }: { voltarPara?: string }) {
  return (
    <div className="so-tela flex flex-wrap items-center justify-center gap-3 py-4 text-papel">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded bg-chope px-5 py-2.5 font-semibold text-tinta hover:bg-chope-escuro"
      >
        Imprimir
      </button>
      <a href={voltarPara} className="rounded border border-papel/40 px-4 py-2 hover:bg-papel/10">
        Editar o cardápio
      </a>
      <p className="w-full text-center text-sm text-papel/70">
        Na janela de impressão, escolha <strong>A4</strong>. Não precisa mexer em mais nada.
      </p>
    </div>
  );
}
