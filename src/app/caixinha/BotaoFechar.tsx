"use client";

// Fecha o dia (congela o pagamento e passa os saldos adiante) ou reabre o
// último dia fechado. BotaoTurno faz o mesmo com um turno só. Os dois também
// marcam "Não pago no dia" (como no PC): nada é pago, fica a pagar depois.

import Link from "next/link";
import { useState, useTransition } from "react";
import { ROTULO_TURNO, TURNOS, type Turno } from "@/lib/caixinha/tipos";
import { acaoFecharDia, acaoFecharTurno, acaoNaoPago, acaoReabrirDia } from "./acoes";

type Props = {
  data: string;
  fechado: boolean;
  podeReabrir: boolean;
  diasNoPagamento: number;
  /** Um turno já foi pago: fechar agora paga só este e fecha o dia. */
  restante: Turno | null;
  linksTurno: Record<Turno, string>;
  /** Mostra "Não pago no dia": há turno aberto com alguém marcado e ainda sem a marca. */
  naoPago: boolean;
};

const nome = (t: Turno) => ROTULO_TURNO[t].toLowerCase();

const DEPOIS = "Nada é pago agora: fica a pagar depois, e o PC não muda mais as presenças.";

export default function BotaoFechar(props: Props) {
  const { data, fechado, podeReabrir, diasNoPagamento, restante, linksTurno, naoPago } = props;
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();

  function fechar() {
    const texto = restante
      ? `Fechar o ${nome(restante)} e pagar? Com ele o dia fecha, e os saldos passam para o próximo dia.`
      : "Fechar o dia? O pagamento fica congelado e os saldos passam para o próximo dia.";
    if (!window.confirm(texto)) return;
    iniciar(async () => setAviso((await acaoFecharDia(data)).mensagem));
  }

  function marcarNaoPago() {
    const texto = restante ? `Marcar o ${nome(restante)} como não pago no dia?` : "Marcar o dia como não pago?";
    if (!window.confirm(`${texto} ${DEPOIS}`)) return;
    iniciar(async () => setAviso((await acaoNaoPago(data, null)).mensagem));
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
      ) : (
        <button type="button" disabled={ocupado} onClick={fechar} className="p-btn p-btn-primario min-h-11 px-6">
          {restante ? `Fechar o ${nome(restante)} e pagar` : "Fechar o dia e pagar"}
        </button>
      )}
      {!fechado && naoPago ? (
        <button type="button" disabled={ocupado} onClick={marcarNaoPago} className="p-btn p-btn-secundario min-h-11 px-6">
          Não pago no dia
        </button>
      ) : null}
      {!fechado && !restante ? (
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
  /** Mostra "Não pago no dia": o turno tem alguém marcado e ainda não tem a marca. */
  naoPago: boolean;
};

export function BotaoTurno({ data, turno, pago, fechaODia, podeReabrir, naoPago }: PropsTurno) {
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

  function marcarNaoPago() {
    if (!window.confirm(`Marcar o ${nome(turno)} como não pago no dia? ${DEPOIS}`)) return;
    iniciar(async () => setAviso((await acaoNaoPago(data, turno)).mensagem));
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
      ) : (
        <button type="button" disabled={ocupado} onClick={fechar} className="p-btn p-btn-primario min-h-11 px-6">
          Fechar o {nome(turno)} e pagar
        </button>
      )}
      {!pago && naoPago ? (
        <button type="button" disabled={ocupado} onClick={marcarNaoPago} className="p-btn p-btn-secundario min-h-11 px-6">
          Não pago no dia
        </button>
      ) : null}
      {aviso ? <p className="text-sm text-cafe">{aviso}</p> : null}
    </div>
  );
}
