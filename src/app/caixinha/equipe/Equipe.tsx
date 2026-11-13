"use client";

import { useState, useTransition } from "react";
import { acaoAdicionarPessoa, acaoAlterarPessoa } from "../acoes";

type Pessoa = {
  id: string;
  nome: string;
  ativo: boolean;
  /** % com que entra no turno (100 = parte cheia). */
  parte: number;
  /** % no domingo; null = o mesmo de todo dia. */
  parteDomingo: number | null;
  saldoTexto: string;
};

const OPCOES = [100, 75, 50, 25];

export default function Equipe({ pessoas }: { pessoas: Pessoa[] }) {
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();

  function rodar(acao: () => Promise<{ ok: boolean; mensagem: string }>, depois?: () => void) {
    iniciar(async () => {
      const r = await acao();
      setAviso(r.mensagem);
      if (r.ok) depois?.();
    });
  }

  return (
    <div className="mt-6">
      <form
        className="p-cartao flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(() => acaoAdicionarPessoa(novo), () => setNovo(""));
        }}
      >
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Nome do funcionário"
          className="p-campo min-w-0 flex-1"
          aria-label="Nome do funcionário"
        />
        <button
          type="submit"
          disabled={ocupado}
          className="p-btn p-btn-primario"
        >
          Adicionar
        </button>
      </form>
      {aviso ? <p className="p-aviso p-aviso-info mt-3">{aviso}</p> : null}

      <ul className="mt-4 grid gap-2">
        {pessoas.length ? (
          pessoas.map((p) => (
            <li
              key={p.id}
              className={`p-cartao flex flex-wrap items-center gap-2 p-3 text-sm ${
                p.ativo ? "" : "border-dashed opacity-60 shadow-none"
              }`}
            >
              {editando?.id === p.id ? (
                <>
                  <input
                    value={editando.nome}
                    onChange={(e) => setEditando({ id: p.id, nome: e.target.value })}
                    className="p-campo min-w-0 flex-1"
                    aria-label="Novo nome"
                  />
                  <button
                    type="button"
                    disabled={ocupado}
                    className="p-btn p-btn-secundario p-btn-sm"
                    onClick={() => rodar(() => acaoAlterarPessoa(p.id, { nome: editando.nome }), () => setEditando(null))}
                  >
                    Salvar
                  </button>
                  <button type="button" className="p-btn p-btn-fantasma p-btn-sm" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 font-semibold">
                    {p.nome}
                    {p.ativo ? null : <span className="font-normal text-cafe"> · desativado</span>}
                    {p.saldoTexto ? <span className="block font-normal text-red-700">deve {p.saldoTexto}</span> : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-cafe">
                    <label className="flex items-center gap-1.5">
                      Parte
                      <select
                        value={p.parte}
                        disabled={ocupado}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          rodar(() => acaoAlterarPessoa(p.id, { parte: v === 100 ? null : v }));
                        }}
                        className="p-campo w-auto py-1"
                      >
                        {OPCOES.map((o) => (
                          <option key={o} value={o}>
                            {o}%
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5">
                      Domingo
                      <select
                        value={p.parteDomingo ?? ""}
                        disabled={ocupado}
                        onChange={(e) =>
                          rodar(() =>
                            acaoAlterarPessoa(p.id, { parteDomingo: e.target.value ? Number(e.target.value) : null }),
                          )
                        }
                        className="p-campo w-auto py-1"
                      >
                        <option value="">igual</option>
                        {OPCOES.map((o) => (
                          <option key={o} value={o}>
                            {o}%
                          </option>
                        ))}
                      </select>
                    </label>
                  </span>
                  <button type="button" className="p-btn p-btn-secundario p-btn-sm" onClick={() => setEditando({ id: p.id, nome: p.nome })}>
                    Renomear
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    className="p-btn p-btn-fantasma p-btn-sm"
                    onClick={() => rodar(() => acaoAlterarPessoa(p.id, { ativo: !p.ativo }))}
                  >
                    {p.ativo ? "Desativar" : "Reativar"}
                  </button>
                </>
              )}
            </li>
          ))
        ) : (
          <li className="rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-6 text-center text-sm text-cafe">Ninguém cadastrado ainda.</li>
        )}
      </ul>
    </div>
  );
}
