"use client";

// A folha de domingo é uma só e tem de caber inteira, mas o número de pratos
// muda toda semana. Então o cabeçalho dela não tem medida fixa: cede espaço à
// lista conforme ela cresce, e volta a crescer quando tiram pratos.
//
// Aqui a folha é medida depois de montada e duas variáveis vão baixando até o
// conteúdo caber nos 297 mm: primeiro --e, que recolhe o cabeçalho (é o que o
// olho perdoa), e só depois --c, que aperta as linhas da lista. A conta é
// refeita do começo a cada vez, por isso nada fica encolhido à toa.

import { useEffect } from "react";
import { ENCAIXE_PRONTO, mioloEstourou } from "./medida";

const PASSO = 0.05; // 20 degraus entre o tamanho desenhado e o mínimo

export default function Encaixe() {
  useEffect(() => {
    const folha = document.querySelector<HTMLElement>(".folha.domingo");
    if (!folha) return;

    const encaixar = () => {
      let e = 1;
      let c = 1;
      const aplicar = () => {
        folha.style.setProperty("--e", e.toFixed(2));
        folha.style.setProperty("--c", c.toFixed(2));
      };
      aplicar();
      while (e > 0 && mioloEstourou(folha)) {
        e = Math.max(0, e - PASSO);
        aplicar();
      }
      while (c > 0 && mioloEstourou(folha)) {
        c = Math.max(0, c - PASSO);
        aplicar();
      }
      // nem no menor tamanho coube: quem avisa é o AvisoEstouro
      folha.toggleAttribute("data-nao-coube", mioloEstourou(folha));
      window.dispatchEvent(new Event(ENCAIXE_PRONTO));
    };

    // as fontes mudam a altura do texto: medir antes delas dá número errado
    const pronto = document.fonts?.ready ?? Promise.resolve();
    pronto.then(() => requestAnimationFrame(encaixar));

    window.addEventListener("resize", encaixar);
    return () => window.removeEventListener("resize", encaixar);
  }, []);

  return null;
}
