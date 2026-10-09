"use client";

// Um funcionário na lista: áreas, ativo/desativado, trocar senha e excluir.

import { useState, useTransition } from "react";
import { AREAS, ROTULO_AREA, type Area } from "@/lib/acessos/areas";
import { acaoAlterarUsuario, acaoExcluirUsuario, type Mudanca } from "./acoes";

type Props = { usuario: string; nome: string; areas: Area[]; ativo: boolean };

export default function LinhaUsuario({ usuario, nome, areas, ativo }: Props) {
  const [aviso, setAviso] = useState("");
  const [novaSenha, setNovaSenha] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function alterar(mudanca: Mudanca, depois?: () => void) {
    iniciar(async () => {
      const r = await acaoAlterarUsuario(usuario, mudanca);
      setAviso(r.mensagem);
      if (r.ok) depois?.();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir ${nome}? A pessoa perde o acesso na hora.`)) return;
    iniciar(async () => {
      const r = await acaoExcluirUsuario(usuario);
      if (!r.ok) setAviso(r.mensagem);
    });
  }

  return (
    <article className={`rounded border p-4 ${ativo ? "border-linha" : "border-dashed border-linha opacity-60"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {nome} <span className="font-normal text-cafe">· {usuario}</span>
        </h3>
        {ativo ? null : <span className="text-sm text-red-700">Desativado</span>}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {AREAS.map((area) => (
          <label key={area} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={areas.includes(area)}
              disabled={ocupado}
              onChange={(e) =>
                alterar({ areas: e.target.checked ? [...areas, area] : areas.filter((a) => a !== area) })
              }
            />
            {ROTULO_AREA[area]}
          </label>
        ))}
      </div>

      {novaSenha !== null ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Nova senha (6 ou mais)"
            autoComplete="new-password"
            className="rounded border border-linha bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={ocupado}
            onClick={() => alterar({ senha: novaSenha }, () => setNovaSenha(null))}
            className="rounded bg-verde px-3 py-2 text-sm font-semibold text-papel"
          >
            Salvar senha
          </button>
          <button type="button" onClick={() => setNovaSenha(null)} className="text-sm text-cafe underline">
            Cancelar
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {novaSenha === null ? (
          <button type="button" onClick={() => setNovaSenha("")} className="text-verde underline">
            Trocar senha
          </button>
        ) : null}
        <button
          type="button"
          disabled={ocupado}
          onClick={() => alterar({ ativo: !ativo })}
          className="text-cafe underline"
        >
          {ativo ? "Desativar" : "Reativar"}
        </button>
        <button type="button" disabled={ocupado} onClick={excluir} className="text-red-700 underline">
          Excluir
        </button>
      </div>

      {aviso ? <p className="mt-2 text-sm text-cafe">{aviso}</p> : null}
    </article>
  );
}
