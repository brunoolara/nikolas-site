// O Viradão à mineira é fixo nos domingos: a seção sempre existe na folha de
// domingo, logo acima das sobremesas. Os valores se editam pelo painel, mas ela
// não se remove. Se o arquivo salvo não tiver a seção (gravado antes dela, ou por
// uma tela aberta há tempos), ela volta aqui, na leitura.

import type { MenuSalao, SecaoSalao } from "./tipos";

export const ID_VIRADAO = "viradao";

const SECAO_VIRADAO: SecaoSalao = {
  id: ID_VIRADAO,
  titulo: "Viradão à mineira (Especial da Casa)",
  nota: "Grande, completo e tradicional. Todos acompanham arroz, abacaxi, banana, couve, fritas, ovo, torresmo e tutu de feijão.",
  colunas: ["1 pessoa", "2 pessoas"],
  itens: [
    { nome: "Viradão de bisteca e lombo", precos: [98, 148] },
    { nome: "Viradão de contra filé", precos: [109, 169] },
    { nome: "Viradão de filé mignon", precos: [146, 219] },
    { nome: "Viradão de picanha", precos: [146, 219] },
  ],
};

/** Põe `novo` antes de `ref` na lista, ou no fim se `ref` não estiver nela. */
function antesDe<T>(lista: T[], novo: T, ref: (x: T) => boolean): T[] {
  const i = lista.findIndex(ref);
  return i === -1 ? [...lista, novo] : [...lista.slice(0, i), novo, ...lista.slice(i)];
}

export function comViradao(salao: MenuSalao): MenuSalao {
  if (salao.secoes.some((s) => s.id === ID_VIRADAO)) return salao;
  const eSobremesas = (id: string) => id === "sobremesas";
  return {
    ...salao,
    secoes: antesDe(salao.secoes, SECAO_VIRADAO, (s) => s.id === "sobremesas"),
    folhas: salao.folhas.map((f) =>
      f.abre
        ? {
            ...f,
            grupos: f.grupos.length
              ? f.grupos.map((g, i) => (i === 0 ? antesDe(g, ID_VIRADAO, eSobremesas) : g))
              : [[ID_VIRADAO]],
            secoes: antesDe(f.secoes, ID_VIRADAO, eSobremesas),
          }
        : f,
    ),
  };
}
