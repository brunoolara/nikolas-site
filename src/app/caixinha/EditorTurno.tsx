"use client";

// Um turno do dia: a taxa (da Takeat ou digitada) e quem trabalhou, com o %
// de cada um. Cada mudança grava na hora; o % grava quando sai do campo.

import { useState, useTransition } from "react";
import { PARTE_EQUIPE, reais, ROTULO_TURNO, type Presenca, type Turno } from "@/lib/caixinha/tipos";
import { acaoPresenca, acaoTaxaManual, acaoTodosPresentes } from "./acoes";

type Props = {
  data: string;
  turno: Turno;
  fechado: boolean;
  /** `padrao`: o % com que a pessoa entra quando é marcada. */
  pessoas: { id: string; nome: string; padrao: number }[];
  presencas: Presenca[];
  taxa: number;
  taxaManual: number | null;
  takeat: { taxa: number; comandas: number } | null;
  partes: Record<string, number>;
};

const numero = (texto: string) => Number(texto.replace(/\./g, "").replace(",", "."));

export default function EditorTurno(props: Props) {
  const { data, turno, fechado, pessoas, presencas, taxa, taxaManual, takeat, partes } = props;
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();
  const [digitando, setDigitando] = useState<string | null>(null);

  function rodar(acao: () => Promise<{ ok: boolean; mensagem: string }>, depois?: () => void) {
    iniciar(async () => {
      const r = await acao();
      setAviso(r.ok ? "" : r.mensagem);
      if (r.ok) depois?.();
    });
  }

  const pctDe = (id: string) => presencas.find((p) => p.id === id)?.pct ?? null;
  const presentes = presencas.length;

  return (
    <section className="p-cartao p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="p-cartao-titulo">{ROTULO_TURNO[turno]}</h3>
        <span className="p-selo">
          {presentes} {presentes === 1 ? "pessoa" : "pessoas"}
        </span>
      </div>

      {!fechado && taxa > 0 && !presencas.some((p) => p.pct > 0) ? (
        <p className="p-aviso p-aviso-alerta mt-3">
          Este turno teve taxa e ninguém marcado: o dia não fecha assim.
        </p>
      ) : null}
      <div className="mt-3 rounded-[var(--p-raio-sm)] bg-creme/70 p-3 text-sm">
        <p>
          Taxa do turno: <strong className="tabular-nums">{reais(taxa)}</strong>
          <span className="text-cafe"> · equipe recebe {reais(Math.round(taxa * PARTE_EQUIPE * 100) / 100)}</span>
        </p>
        {fechado ? null : taxaManual !== null ? (
          <p className="mt-1 text-cafe">
            Digitada à mão.{" "}
            <button
              type="button"
              disabled={ocupado}
              className="font-semibold text-verde hover:underline"
              onClick={() => rodar(() => acaoTaxaManual(data, turno, null))}
            >
              Usar a da Takeat
            </button>
          </p>
        ) : takeat ? (
          <p className="mt-1 text-cafe">
            Da Takeat, {takeat.comandas} {takeat.comandas === 1 ? "comanda paga" : "comandas pagas"}.
          </p>
        ) : null}
        {fechado ? null : digitando === null ? (
          <button type="button" className="mt-1 text-sm font-semibold text-verde hover:underline" onClick={() => setDigitando("")}>
            Digitar a taxa
          </button>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              inputMode="decimal"
              value={digitando}
              onChange={(e) => setDigitando(e.target.value)}
              placeholder="0,00"
              className="p-campo w-32"
              aria-label={`Taxa do ${ROTULO_TURNO[turno]}`}
            />
            <button
              type="button"
              disabled={ocupado}
              className="p-btn p-btn-primario p-btn-sm"
              onClick={() => rodar(() => acaoTaxaManual(data, turno, numero(digitando)), () => setDigitando(null))}
            >
              Salvar
            </button>
            <button type="button" className="p-btn p-btn-fantasma p-btn-sm" onClick={() => setDigitando(null)}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      <ul className="mt-3 divide-y divide-linha/70">
        {pessoas.map((p) => {
          const pct = pctDe(p.id);
          return (
            <li key={p.id} className="flex min-h-12 items-center gap-2 py-1.5 text-sm">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--color-verde)]"
                  aria-label={`${p.nome} trabalhou no ${ROTULO_TURNO[turno]}`}
                  checked={pct !== null}
                  disabled={fechado || ocupado}
                  onChange={(e) => rodar(() => acaoPresenca(data, turno, p.id, e.target.checked ? p.padrao : null))}
                />
                <span className="truncate">{p.nome}</span>
              </label>
              {pct !== null ? (
                <>
                  <input
                    key={`${p.id}-${pct}`}
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={pct}
                    disabled={fechado || ocupado}
                    onBlur={(e) => {
                      const novo = Number(e.target.value);
                      if (novo !== pct) rodar(() => acaoPresenca(data, turno, p.id, novo));
                    }}
                    className="p-campo w-16 px-2 text-right tabular-nums"
                    aria-label={`% de ${p.nome} no ${ROTULO_TURNO[turno]}`}
                  />
                  <span className="text-cafe">%</span>
                  <span className="w-24 text-right font-semibold tabular-nums">{reais(partes[p.id] ?? 0)}</span>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!fechado && pessoas.some((p) => pctDe(p.id) === null) ? (
        <button
          type="button"
          disabled={ocupado}
          className="p-btn p-btn-fantasma p-btn-sm mt-2"
          onClick={() => rodar(() => acaoTodosPresentes(data, turno))}
        >
          Marcar todos
        </button>
      ) : null}
      {aviso ? <p className="p-aviso p-aviso-erro mt-3">{aviso}</p> : null}
    </section>
  );
}
