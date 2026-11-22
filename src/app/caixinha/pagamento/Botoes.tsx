"use client";

// Fechar e pagar o período escolhido, ou reabrir o último pagamento; ao lado,
// o PDF da tela (abre numa aba nova, de onde se baixa, imprime ou compartilha).

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acaoFecharPeriodo, acaoReabrirPagamento } from "../acoes";
import { idPagamento, lerIdPagamento, ROTULO_TURNO } from "@/lib/caixinha/tipos";

export function BotaoPdf({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="p-btn p-btn-secundario min-h-11 px-6">
      Gerar PDF
    </a>
  );
}

export function FecharPeriodo({
  ini,
  fim,
  dias,
  total,
  pdf,
}: {
  ini: string;
  fim: string;
  dias: number;
  total: string;
  pdf: string;
}) {
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();
  const router = useRouter();

  function fechar() {
    const texto = `Fechar ${dias === 1 ? "o dia" : `os ${dias} dias`} e pagar ${total}? Os valores ficam congelados e os saldos passam adiante.`;
    if (!window.confirm(texto)) return;
    iniciar(async () => {
      const r = await acaoFecharPeriodo(ini, fim);
      setAviso(r.mensagem);
      if (r.ok) router.push(`/caixinha/pagamento?id=${idPagamento(ini, fim)}`);
    });
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-linha/70 pt-4">
      <button type="button" disabled={ocupado} onClick={fechar} className="p-btn p-btn-primario min-h-11 px-6">
        {ocupado ? "Fechando…" : dias === 1 ? "Fechar o dia e pagar" : `Fechar os ${dias} dias e pagar`}
      </button>
      <BotaoPdf href={pdf} />
      {aviso ? (
        <p className="text-sm text-cafe" role="status">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}

export function ReabrirPagamento({ id, dias, pdf }: { id: string; dias: number; pdf: string }) {
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();
  const router = useRouter();

  function reabrir() {
    const { ini, fim, turno } = lerIdPagamento(id);
    const texto = turno
      ? `Reabrir o pagamento? O ${ROTULO_TURNO[turno].toLowerCase()} volta a ficar aberto e os saldos voltam ao que eram.`
      : `Reabrir o pagamento? ${dias === 1 ? "O dia volta" : `Os ${dias} dias voltam`} a ficar aberto${dias === 1 ? "" : "s"} e os saldos voltam ao que eram.`;
    if (!window.confirm(texto)) return;
    iniciar(async () => {
      const r = await acaoReabrirPagamento(id);
      setAviso(r.mensagem);
      if (r.ok) router.push(turno ? `/caixinha?dia=${ini}&ver=${turno}` : `/caixinha/pagamento?ini=${ini}&fim=${fim}`);
    });
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-linha/70 pt-4">
      <BotaoPdf href={pdf} />
      <button type="button" disabled={ocupado} onClick={reabrir} className="p-btn p-btn-secundario">
        Reabrir o pagamento
      </button>
      {aviso ? (
        <p className="text-sm text-cafe" role="status">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
