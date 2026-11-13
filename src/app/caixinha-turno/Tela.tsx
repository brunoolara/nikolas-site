"use client";

// A tela do PC: um botão grande por pessoa (toca para marcar ou desmarcar),
// a taxa do turno, quanto cada um recebe e o botão de fechar e pagar.

import { useState, useTransition } from "react";
import { PARTE_EQUIPE, reais, ROTULO_TURNO, type Turno } from "@/lib/caixinha/tipos";
import { acaoPcNaoPago, acaoPcPagarTurno, acaoPcPresenca } from "@/app/caixinha/acoes";

export type PessoaTela = {
  id: string;
  nome: string;
  presente: boolean;
  /** % no turno (ou o padrão, se ainda não marcada). */
  pct: number;
  parte: number;
  recebe: number;
  /** O valor a receber já desconta consumo ou saldo. */
  descontou: boolean;
};

type Props = {
  data: string;
  turno: Turno;
  titulo: string;
  taxa: number | null;
  equipeRecebe: number | null;
  origem: string;
  pessoas: PessoaTela[];
  pago: { em: string; por: string } | null;
  /** Encerrado sem pagamento ("Não pago no dia"). */
  encerrado: { em: string; por: string } | null;
};

const rotuloPct = (pct: number) => (pct === 100 ? "" : pct === 50 ? "meia parte" : `${pct}% da parte`);

export default function Tela({ data, turno, titulo, taxa, equipeRecebe, origem, pessoas, pago, encerrado }: Props) {
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const presentes = pessoas.filter((p) => p.presente);
  const total = presentes.reduce((s, p) => s + p.recebe, 0);
  const nomeTurno = ROTULO_TURNO[turno].toLowerCase();
  const travado = Boolean(pago || encerrado);

  function marcar(p: PessoaTela) {
    iniciar(async () => {
      const r = await acaoPcPresenca(data, turno, p.id, !p.presente);
      setAviso(r.ok ? null : { ok: false, texto: r.mensagem });
    });
  }

  function pagar() {
    const texto =
      `Fechar e pagar o ${nomeTurno}?\n\n${presentes.length} ${presentes.length === 1 ? "pessoa" : "pessoas"}, ` +
      `${reais(total)} no total.\n\nDepois de pago, só o Bruno consegue reabrir.`;
    if (!window.confirm(texto)) return;
    iniciar(async () => {
      const r = await acaoPcPagarTurno(data, turno);
      setAviso({ ok: r.ok, texto: r.mensagem });
    });
  }

  function naoPago() {
    const texto =
      `Encerrar o ${nomeTurno} sem pagar?\n\n${presentes.length} ${presentes.length === 1 ? "pessoa fica marcada" : "pessoas ficam marcadas"} ` +
      `e o valor fica a pagar pelo Bruno.\n\nDepois disso, só o Bruno consegue mudar.`;
    if (!window.confirm(texto)) return;
    iniciar(async () => {
      const r = await acaoPcNaoPago(data, turno);
      setAviso({ ok: r.ok, texto: r.mensagem });
    });
  }

  return (
    <div className="mt-6">
      <section className="p-cartao p-5 sm:p-6">
        <p className="font-display text-3xl first-letter:uppercase sm:text-4xl">{titulo}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="p-kpi-rotulo">Taxa do turno</p>
            <p className="p-kpi-valor tabular-nums">{taxa === null ? "—" : reais(taxa)}</p>
          </div>
          <div>
            <p className="p-kpi-rotulo">Para a equipe (menos {Math.round((1 - PARTE_EQUIPE) * 100)}% da casa)</p>
            <p className="p-kpi-valor tabular-nums text-verde">{equipeRecebe === null ? "—" : reais(equipeRecebe)}</p>
          </div>
        </div>
        {origem ? <p className="mt-2 text-sm text-cafe">{origem}</p> : null}
        {pago ? (
          <p className="p-aviso p-aviso-ok mt-4 text-base">
            {ROTULO_TURNO[turno]} pago às {pago.em} por {pago.por}. Para mudar alguma coisa, fale com o Bruno.
          </p>
        ) : encerrado ? (
          <p className="p-aviso p-aviso-alerta mt-4 text-base">
            {ROTULO_TURNO[turno]} encerrado sem pagamento às {encerrado.em} por {encerrado.por}. Fica a pagar pelo Bruno.
          </p>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-2xl">
          {travado ? "Quem trabalhou" : "Quem trabalhou? Toque no seu nome"}
          <span className="ml-2 align-middle text-base font-normal text-cafe">
            {presentes.length} {presentes.length === 1 ? "pessoa" : "pessoas"}
          </span>
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(travado ? presentes : pessoas).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={ocupado || travado}
                onClick={() => marcar(p)}
                aria-pressed={p.presente}
                className={`flex min-h-20 w-full items-center gap-3 rounded-[var(--p-raio)] border-2 p-4 text-left transition-colors duration-150 disabled:cursor-default ${
                  p.presente ? "border-verde bg-verde/10" : "border-linha bg-white hover:border-verde/50"
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold ${
                    p.presente ? "border-verde bg-verde text-papel" : "border-linha text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl leading-tight font-semibold">{p.nome}</span>
                  <span className="block text-sm text-cafe">
                    {p.presente ? rotuloPct(p.pct) || "parte cheia" : rotuloPct(p.pct) || "não marcado"}
                  </span>
                </span>
                {p.presente ? (
                  <span className="shrink-0 text-right">
                    <span className="block text-2xl font-semibold tabular-nums">{reais(p.recebe)}</span>
                    {p.descontou ? <span className="block text-xs text-cafe">já descontado o consumo</span> : null}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {aviso ? (
        <p className={`p-aviso mt-5 text-base ${aviso.ok ? "p-aviso-ok" : "p-aviso-erro"}`}>{aviso.texto}</p>
      ) : null}

      {travado ? null : (
        <section className="p-cartao mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="p-kpi-rotulo">Total a pagar no {nomeTurno}</p>
            <p className="p-kpi-valor tabular-nums">{reais(total)}</p>
            {taxa === null ? (
              <p className="mt-1 text-sm text-cafe">Sem a taxa da Takeat não dá para pagar. Avise o Bruno.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={ocupado || !presentes.length}
              onClick={naoPago}
              className="p-btn p-btn-secundario min-h-14 px-6 text-lg"
            >
              Não pago no dia
            </button>
            <button
              type="button"
              disabled={ocupado || taxa === null || !presentes.length}
              onClick={pagar}
              className="p-btn p-btn-primario min-h-14 px-8 text-lg"
            >
              {ocupado ? "Aguarde…" : `Fechar e pagar o ${nomeTurno}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
