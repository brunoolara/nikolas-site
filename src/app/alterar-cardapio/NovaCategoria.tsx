"use client";

// Acrescentar uma categoria ao menu do salão.
//
// Além do nome, a pessoa precisa dizer ONDE a categoria entra: o impresso é um
// conjunto de folhas A4 com arranjo fixo, e uma categoria que não está em
// nenhuma folha simplesmente não sai no papel. Por isso o destino é obrigatório,
// e "folha nova" é a opção padrão — numa folha nova sempre cabe.

import { useState } from "react";
import type { FolhaSalao, MenuSalao } from "@/lib/menu/tipos";

export type Destino = { tipo: "nova" } | { tipo: "folha"; folha: number; coluna: number };

/** Id a partir do nome: "Sobremesas" -> "sobremesas". Sem repetir id que já existe. */
export function idDoNome(nome: string, usados: string[]): string {
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "categoria";
  if (!usados.includes(base)) return base;
  let n = 2;
  while (usados.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Folhas que podem receber uma categoria: fora a capa e a folha de domingo. */
function folhasDisponiveis(menu: MenuSalao): { folha: FolhaSalao; indice: number }[] {
  return menu.folhas
    .map((folha, indice) => ({ folha, indice }))
    .filter(({ folha }) => folha.miolo !== "hist" && !folha.abre);
}

export default function NovaCategoria({
  menu,
  aoCriar,
  destinoFixo,
}: {
  menu: MenuSalao;
  aoCriar: (nome: string, destino: Destino, doisPrecos: boolean) => void;
  /** Quando a peça tem uma folha só (domingo), não há o que escolher. */
  destinoFixo?: Destino;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [onde, setOnde] = useState("nova");
  const [doisPrecos, setDoisPrecos] = useState(false);

  const opcoes = folhasDisponiveis(menu).flatMap(({ folha, indice }) =>
    (folha.grupos.length ? folha.grupos : [[]]).map((_, coluna) => ({
      valor: `${indice}:${coluna}`,
      rotulo:
        folha.grupos.length > 1
          ? `${folha.titulo} — coluna ${coluna + 1}`
          : folha.titulo,
    })),
  );

  const criar = () => {
    if (!nome.trim()) return;
    const destino: Destino =
      destinoFixo ??
      (onde === "nova"
        ? { tipo: "nova" }
        : { tipo: "folha", folha: Number(onde.split(":")[0]), coluna: Number(onde.split(":")[1]) });
    aoCriar(nome.trim(), destino, doisPrecos);
    setNome("");
    setOnde("nova");
    setDoisPrecos(false);
    setAberto(false);
  };

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-10 w-full rounded border border-dashed border-verde/50 px-4 py-3 font-semibold text-verde hover:bg-creme"
      >
        + Acrescentar categoria
      </button>
    );
  }

  return (
    <section className="mt-10 rounded border border-verde p-5">
      <h2 className="font-display text-2xl">Nova categoria</h2>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Nome</span>
        <input
          className="mt-1 w-full rounded border border-linha bg-white px-2.5 py-1.5"
          placeholder="Ex.: Sobremesas"
          value={nome}
          autoFocus
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && criar()}
        />
      </label>

      {destinoFixo ? null : (
      <label className="mt-4 block">
        <span className="text-sm font-semibold">Em qual folha ela entra</span>
        <select
          className="mt-1 w-full rounded border border-linha bg-white px-2.5 py-2"
          value={onde}
          onChange={(e) => setOnde(e.target.value)}
        >
          <option value="nova">Numa folha nova (sempre cabe)</option>
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-cafe">
          Pondo numa folha que já existe, confira depois em &ldquo;Ver e imprimir&rdquo; se tudo
          coube — a folha tem tamanho fixo.
        </span>
      </label>
      )}

      <label className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={doisPrecos}
          onChange={(e) => setDoisPrecos(e.target.checked)}
          className="size-4"
        />
        <span className="text-sm">Dois preços por prato (1 pessoa e 2 pessoas)</span>
      </label>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={criar}
          disabled={!nome.trim()}
          className="rounded bg-verde px-4 py-2 font-semibold text-papel hover:bg-verde-escuro disabled:opacity-50"
        >
          Criar categoria
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded border border-linha px-4 py-2 text-cafe hover:bg-creme"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
