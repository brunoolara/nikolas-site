"use client";

// Fecha o dia (congela o pagamento e passa os saldos adiante) ou reabre o
// último dia fechado. BotaoTurno faz o mesmo com um turno só.

import Link from "next/link";
import { useState, useTransition } from "react";
import { ROTULO_TURNO, TURNOS, type Turno } from "@/lib/caixinha/tipos";
import { acaoFecharDia, acaoFecharTurno, acaoReabrirDia } from "./acoes";

type Props = {
  data: string;
  fechado: boolean;
  podeReabrir: boolean;
  bloqueado: boolean;
  diasNoPagamento: number;
  /** Um turno já foi pago: fechar agora paga só este e fecha o dia. */
  restante: Turno | null;
  linksTurno: Record<Turno, string>;
};

const nome = (t: Turno) => ROTULO_TURNO[t].toLowerCase();

export default function BotaoFechar(props: Props) {
  const { data, fechado, podeReabrir, bloqueado, diasNoPagamento, restante, linksTurno } = props;
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();

  function fechar() {
    const texto = restante
      ? `Fechar o ${nome(restante)} e pagar? Com ele o dia fecha, e os saldos passam para o próximo dia.`
      : "Fechar o dia? O pagamento fica congelado e os saldos passam para o próximo dia.";
    if (!window.confirm(texto)) return;
    iniciar(async () => setAviso((await acaoFecharDia(data)).mensagem));
  }

  function reabrir() {
    const texto =
      diasNoPagamento > 1
        ? `Este dia foi pago junto com outros. Reabrir reabre os ${diasNoPagamento} dias do pagamento, e os saldos voltam ao que eram. Continuar?`
        : "Reabrir o dia? Os saldos voltam ao que eram antes do fechamento.";
    if (!window.confirm(texto)) return;
    iniciar(async () => setAviso((await acaoReabrirDia(data)).mensagem));
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-linha/70 pt-4">
      {fechado ? (
        podeReabrir ? (
          <button type="button" disabled={ocupado} onClick={reabrir} className="p-btn p-btn-secundario">
            {diasNoPagamento > 1 ? `Reabrir o pagamento (${diasNoPagamento} dias)` : "Reabrir o dia"}
          </button>
        ) : (
          <p className="text-sm text-cafe">Para reabrir, reabra antes os pagamentos feitos depois deste.</p>
        )
      ) : bloqueado ? (
        <p className="text-sm text-cafe">Há um dia fechado depois deste; os dias se fecham em ordem.</p>
      ) : (
        <button type="button" disabled={ocupado} onClick={fechar} className="p-btn p-btn-primario min-h-11 px-6">
          {restante ? `Fechar o ${nome(restante)} e pagar` : "Fechar o dia e pagar"}
        </button>
      )}
      {!fechado && !bloqueado && !restante ? (
        <p className="text-sm text-cafe">
          ou{" "}
          {TURNOS.map((t, i) => (
            <span key={t}>
              {i ? ", " : ""}
              <Link href={linksTurno[t]} className="font-semibold text-verde hover:underline">
                só o {nome(t)}
              </Link>
            </span>
          ))}
          ,{" "}
          <Link href="/caixinha/pagamento" className="font-semibold text-verde hover:underline">
            vários dias de uma vez
          </Link>
        </p>
      ) : null}
      {aviso ? <p className="text-sm text-cafe">{aviso}</p> : null}
    </div>
  );
}

type PropsTurno = {
  data: string;
  turno: Turno;
  /** O turno já está pago (sozinho ou com o dia). */
  pago: boolean;
  /** O outro turno já foi pago: pagar este fecha o dia. */
  fechaODia: boolean;
  podeReabrir: boolean;
  bloqueado: boolean;
};

export function BotaoTurno({ data, turno, pago, fechaODia, podeReabrir, bloqueado }: PropsTurno) {
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();

  function fechar() {
    const texto = fechaODia
      ? `Fechar o ${nome(turno)} e pagar? Com ele o dia fecha.`
      : `Fechar o ${nome(turno)} e pagar? A taxa, quem trabalhou e o consumo lançado no ${nome(turno)} ficam congelados. O resto do dia continua aberto.`;
    if (!window.confirm(texto)) return;
    iniciar(async () => setAviso((await acaoFecharTurno(data, turno)).mensagem));
  }

  function reabrir() {
    if (!window.confirm(`Reabrir o ${nome(turno)}? Os saldos voltam ao que eram antes do pagamento.`)) return;
    iniciar(async () => setAviso((await acaoReabrirDia(data)).mensagem));
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-linha/70 pt-4">
      {pago ? (
        podeReabrir ? (
          <button type="button" disabled={ocupado} onClick={reabrir} className="p-btn p-btn-secundario">
            Reabrir o {nome(turno)}
          </button>
        ) : (
          <p className="text-sm text-cafe">O {nome(turno)} já foi pago.</p>
        )
      ) : bloqueado ? (
        <p className="text-sm text-cafe">Há um dia fechado depois deste; os dias se fecham em ordem.</p>
      ) : (
        <button type="button" disabled={ocupado} onClick={fechar} className="p-btn p-btn-primario min-h-11 px-6">
          Fechar o {nome(turno)} e pagar
        </button>
      )}
      {aviso ? <p className="text-sm text-cafe">{aviso}</p> : null}
    </div>
  );
}
