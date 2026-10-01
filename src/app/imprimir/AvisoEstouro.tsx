"use client";

// A folha tem tamanho fixo e corta o que não cabe (overflow: hidden). Sem aviso,
// um prato a mais numa folha cheia some do papel caladamente — e ninguém
// percebe até o cardápio voltar da impressora.
//
// Isto mede cada folha depois de montada e avisa, só na tela, quais estouraram.

import { useEffect, useState } from "react";

const FOLGA = 4; // px de tolerância, para arredondamento do navegador

export default function AvisoEstouro() {
  const [cheias, setCheias] = useState<string[]>([]);

  useEffect(() => {
    const medir = () => {
      const estouradas: string[] = [];
      document.querySelectorAll<HTMLElement>(".folha").forEach((folha, i) => {
        const passou = folha.scrollHeight > folha.clientHeight + FOLGA;
        folha.style.outline = passou ? "3px solid #b91c1c" : "";
        folha.style.outlineOffset = passou ? "-3px" : "";
        if (passou) {
          const titulo = folha.querySelector("h1,h2")?.textContent?.trim();
          estouradas.push(titulo || `folha ${i + 1}`);
        }
      });
      setCheias(estouradas);
    };

    // espera as fontes, que mudam a altura do texto
    const pronto = document.fonts?.ready ?? Promise.resolve();
    pronto.then(() => requestAnimationFrame(medir));

    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  if (!cheias.length) return null;

  return (
    <div className="so-tela mx-auto max-w-2xl rounded border-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">
      <strong>Atenção: não coube tudo na folha.</strong> O que passou do tamanho da página
      não vai sair impresso em: {cheias.join(", ")}. Tire algum prato, encurte descrições
      ou mova a categoria para outra folha.
    </div>
  );
}
