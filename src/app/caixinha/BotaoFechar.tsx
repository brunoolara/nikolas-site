"use client";

// Fecha o dia (congela o pagamento e passa os saldos adiante) ou reabre o
// último dia fechado.

import { useState, useTransition } from "react";
import { acaoFecharDia, acaoReabrirDia } from "./acoes";

type Props = { data: string; fechado: boolean; podeReabrir: boolean; bloqueado: boolean };

export default function BotaoFechar({ data, fechado, podeReabrir, bloqueado }: Props) {
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();

  function fechar() {
    if (!window.confirm("Fechar o dia? O pagamento fica congelado e os saldos passam para o próximo dia.")) return;
    iniciar(async () => setAviso((await acaoFecharDia(data)).mensagem));
  }

  function reabrir() {
    if (!window.confirm("Reabrir o dia? Os saldos voltam ao que eram antes do fechamento.")) return;
    iniciar(async () => setAviso((await acaoReabrirDia(data)).mensagem));
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-linha/70 pt-4">
      {fechado ? (
        podeReabrir ? (
          <button type="button" disabled={ocupado} onClick={reabrir} className="p-btn p-btn-secundario">
            Reabrir o dia
          </button>
        ) : (
          <p className="text-sm text-cafe">Para reabrir, reabra antes os dias fechados depois deste.</p>
        )
      ) : bloqueado ? (
        <p className="text-sm text-cafe">Há um dia fechado depois deste; os dias se fecham em ordem.</p>
      ) : (
        <button
          type="button"
          disabled={ocupado}
          onClick={fechar}
          className="p-btn p-btn-primario min-h-11 px-6"
        >
          Fechar o dia e pagar
        </button>
      )}
      {aviso ? <p className="text-sm text-cafe">{aviso}</p> : null}
    </div>
  );
}
