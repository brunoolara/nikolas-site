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
    <article className={`p-cartao p-4 ${ativo ? "" : "border-dashed opacity-60 shadow-none"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {nome} <span className="font-normal text-cafe">· {usuario}</span>
        </h3>
        {ativo ? null : <span className="p-selo p-selo-vermelho">Desativado</span>}
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
            className="p-campo w-auto"
          />
          <button
            type="button"
            disabled={ocupado}
            onClick={() => alterar({ senha: novaSenha }, () => setNovaSenha(null))}
            className="p-btn p-btn-primario"
          >
            Salvar senha
          </button>
          <button type="button" onClick={() => setNovaSenha(null)} className="p-btn p-btn-fantasma">
            Cancelar
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-linha/70 pt-3">
        {novaSenha === null ? (
          <button type="button" onClick={() => setNovaSenha("")} className="p-btn p-btn-secundario p-btn-sm">
            Trocar senha
          </button>
        ) : null}
        <button
          type="button"
          disabled={ocupado}
          onClick={() => alterar({ ativo: !ativo })}
          className="p-btn p-btn-secundario p-btn-sm"
        >
          {ativo ? "Desativar" : "Reativar"}
        </button>
        <button type="button" disabled={ocupado} onClick={excluir} className="p-btn p-btn-perigo p-btn-sm ml-auto">
          Excluir
        </button>
      </div>

      {aviso ? <p className="mt-2 text-sm text-cafe">{aviso}</p> : null}
    </article>
  );
}
