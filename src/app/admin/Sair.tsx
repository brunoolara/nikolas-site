"use client";

import { acaoSair } from "./acoes";

export default function Sair() {
  return (
    <button
      type="button"
      onClick={() => acaoSair()}
      className="rounded border border-linha px-3 py-2 text-sm text-cafe hover:bg-creme"
    >
      Sair
    </button>
  );
}
