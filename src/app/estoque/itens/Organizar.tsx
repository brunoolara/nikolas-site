"use client";

import { useState, useTransition } from "react";
import { CATEGORIAS, type Categoria } from "@/lib/estoque/categorias";
import { acaoAjustarItem } from "../acoes";

type Linha = {
  id: number;
  nome: string;
  unidade: string;
  automatica: Categoria;
  categoria: Categoria | null;
  naoContar: boolean;
};

export default function Organizar({ linhas }: { linhas: Linha[] }) {
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();
  const termo = busca.trim().toLowerCase();
  const visiveis = linhas.filter((l) => !termo || l.nome.toLowerCase().includes(termo));

  function ajustar(id: number, mudanca: { categoria?: string | null; naoContar?: boolean }) {
    iniciar(async () => {
      const r = await acaoAjustarItem(id, mudanca);
      setAviso(r.ok ? "" : r.mensagem);
    });
  }

  return (
    <div className="mt-6">
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar item…"
        className="p-campo"
        aria-label="Buscar item"
      />
      {aviso ? <p className="p-aviso p-aviso-erro mt-3">{aviso}</p> : null}
      <ul className="p-cartao mt-4 divide-y divide-linha/70">
        {visiveis.map((l) => (
          <li key={l.id} className={`flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm ${l.naoContar ? "opacity-55" : ""}`}>
            <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">
              <span className="block font-medium">{l.nome}</span>
              <span className="text-xs text-cafe">
                {l.unidade || "un"}
                {l.categoria ? " · categoria trocada à mão" : ""}
              </span>
            </span>
            <select
              value={l.categoria ?? l.automatica}
              disabled={ocupado}
              onChange={(e) => ajustar(l.id, { categoria: e.target.value === l.automatica ? null : e.target.value })}
              className="p-campo w-auto flex-1 sm:flex-none"
              aria-label={`Categoria de ${l.nome}`}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-cafe">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-verde)]"
                checked={!l.naoContar}
                disabled={ocupado}
                onChange={(e) => ajustar(l.id, { naoContar: !e.target.checked })}
              />
              Contar
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
