"use client";

import { acaoSair } from "@/lib/acessos/acoes";

export default function Sair() {
  return (
    <button type="button" onClick={() => acaoSair()} className="p-btn p-btn-secundario p-btn-sm">
      Sair
    </button>
  );
}
