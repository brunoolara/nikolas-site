"use client";

// Os botões de pagar uma pessoa pelo Pix: a chave cadastrada e, depois de
// fechado, o "Pix copia e cola" já com o valor dela (lib/caixinha/pix).

import { useState } from "react";
import { copiarTexto } from "@/lib/copiar";

export default function BotoesPix({
  rotulo,
  mostrar,
  chave,
  codigo,
  nova,
}: {
  rotulo: string;
  mostrar: string;
  /** O que vai para a área de transferência no "Copiar chave". */
  chave: string;
  /** Pix copia e cola com o valor; null na prévia ou sem nada a pagar. */
  codigo: string | null;
  /** "26/11" se a chave foi trocada há pouco: conferir antes de pagar. */
  nova: string | null;
}) {
  const [copiado, setCopiado] = useState<"chave" | "codigo" | null>(null);

  async function copiar(qual: "chave" | "codigo", texto: string) {
    if (!(await copiarTexto(texto))) return;
    setCopiado(qual);
    setTimeout(() => setCopiado((c) => (c === qual ? null : c)), 4000);
  }

  return (
    <div>
      <p className="text-xs text-cafe">
        {rotulo} · <span className="break-all font-medium text-tinta">{mostrar}</span>
        {nova ? <span className="p-selo p-selo-ambar ml-1.5">chave nova desde {nova}</span> : null}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => copiar("chave", chave)} className="p-btn p-btn-secundario p-btn-sm flex-1">
          {copiado === "chave" ? "Chave copiada ✓" : "Copiar chave"}
        </button>
        {codigo ? (
          <button type="button" onClick={() => copiar("codigo", codigo)} className="p-btn p-btn-primario p-btn-sm flex-1">
            {copiado === "codigo" ? "Copiado ✓" : "Pix com valor"}
          </button>
        ) : null}
      </div>
      {copiado === "codigo" ? (
        <p className="mt-1.5 text-xs text-cafe" role="status">
          No app do banco, use Pix copia e cola e cole. Confira o nome antes de pagar.
        </p>
      ) : null}
    </div>
  );
}
