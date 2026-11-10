"use client";

// Consumo do funcionário no dia: entra cheio, descontado da caixinha.

import { useState, useTransition } from "react";
import { reais } from "@/lib/caixinha/tipos";
import { acaoAdicionarConsumo, acaoRemoverConsumo } from "./acoes";

type Props = {
  data: string;
  fechado: boolean;
  equipe: { id: string; nome: string }[];
  consumos: { id: string; nome: string; valor: number; descricao: string }[];
};

const numero = (texto: string) => Number(texto.replace(/\./g, "").replace(",", "."));

export default function Consumos({ data, fechado, equipe, consumos }: Props) {
  const [pessoa, setPessoa] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();

  function adicionar() {
    iniciar(async () => {
      const r = await acaoAdicionarConsumo(data, pessoa, numero(valor), descricao);
      setAviso(r.ok ? "" : r.mensagem);
      if (r.ok) {
        setValor("");
        setDescricao("");
      }
    });
  }

  function remover(id: string) {
    iniciar(async () => {
      const r = await acaoRemoverConsumo(data, id);
      setAviso(r.ok ? "" : r.mensagem);
    });
  }

  const total = consumos.reduce((s, c) => s + c.valor, 0);

  return (
    <section id="consumo" className="p-cartao mt-6 scroll-mt-24 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="p-cartao-titulo">Consumo da equipe</h3>
        {consumos.length ? <span className="p-selo tabular-nums">{reais(total)}</span> : null}
      </div>
      <p className="text-sm text-cafe">Descontado cheio da caixinha de quem consumiu.</p>

      {consumos.length ? (
        <ul className="mt-3 divide-y divide-linha/70 text-sm">
          {consumos.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate">
                {c.nome}
                {c.descricao ? <span className="text-cafe"> · {c.descricao}</span> : null}
              </span>
              <span className="tabular-nums">{reais(c.valor)}</span>
              {fechado ? null : (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => remover(c.id)}
                  className="p-btn p-btn-perigo p-btn-sm"
                >
                  Tirar
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-cafe">Nenhum consumo lançado neste dia.</p>
      )}

      {fechado ? null : (
        <div className="mt-4 grid gap-2 rounded-[var(--p-raio-sm)] bg-creme/70 p-3 sm:grid-cols-[12rem_7rem_1fr_auto]">
          <select
            value={pessoa}
            onChange={(e) => setPessoa(e.target.value)}
            className="p-campo"
            aria-label="Quem consumiu"
          >
            <option value="">Quem consumiu</option>
            {equipe.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Valor"
            className="p-campo text-right"
            aria-label="Valor do consumo"
          />
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que foi (opcional)"
            className="p-campo"
            aria-label="O que foi consumido"
          />
          <button
            type="button"
            disabled={ocupado}
            onClick={adicionar}
            className="p-btn p-btn-primario"
          >
            Lançar
          </button>
        </div>
      )}
      {aviso ? <p className="p-aviso p-aviso-erro mt-3">{aviso}</p> : null}
    </section>
  );
}
