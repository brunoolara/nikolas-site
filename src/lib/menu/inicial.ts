// Conteúdo com que o cardápio nasce: exatamente o que está na peça impressa
// aprovada (Desktop\Nikolas\Cardápio\Executivo), com sábado e domingo em branco
// para o restaurante preencher pelo painel.
//
// Serve de semente inicial e de "voltar ao original" se algo se perder.

import type { Cardapio } from "./tipos";

export const CARDAPIO_INICIAL: Cardapio = {
  versao: 1,
  atualizadoEm: "2026-09-30T00:00:00.000Z",
  atualizadoPor: "carga inicial",
  executivo: {
    titulo: "Menu executivo",
    horario: "Segunda a sexta · 11h às 14h",
    frase: "Boa comida em todos os seus dias.",
    secoes: [
      {
        id: "diarios",
        titulo: "Servidos diariamente",
        nota: "Acompanham salada, arroz, feijão tropeiro ou em caldo e fritas.",
        itens: [
          { nome: "Contra filé", preco: 38 },
          { nome: "Filé mignon", preco: 44 },
          { nome: "Picanha", preco: 56 },
          { nome: "Lombo", preco: 33 },
          { nome: "Frango à milanesa", preco: 33 },
          { nome: "Frango grelhado", preco: 32 },
          { nome: "Peixe à milanesa", desc: "Salada, arroz, legumes cozidos e fritas.", preco: 35 },
        ],
      },
      {
        id: "salada",
        titulo: "Salada e proteína",
        nota: "Folhas verdes e legumes variados, com a proteína à sua escolha.",
        itens: [
          { nome: "Contra filé", preco: 38 },
          { nome: "Filé mignon", preco: 44 },
          { nome: "Picanha", preco: 56 },
          { nome: "Lombo grelhado", preco: 33 },
          { nome: "Frango à milanesa", preco: 33 },
          { nome: "Frango grelhado", preco: 32 },
          { nome: "Peixe à milanesa", preco: 35 },
        ],
      },
      {
        id: "adicionais",
        titulo: "Adicionais",
        itens: [
          { nome: "Ovo frito", preco: 3 },
          { nome: "Feijão em caldo", preco: 6 },
          { nome: "Cebolas", preco: 3 },
        ],
      },
      {
        id: "proteinas",
        titulo: "Proteínas adicionais",
        itens: [
          { nome: "Contra filé", preco: 19 },
          { nome: "Filé mignon", preco: 25 },
          { nome: "Picanha", preco: 36 },
          { nome: "Lombo", preco: 14 },
          { nome: "Filé de frango", preco: 14 },
        ],
      },
    ],
    especiais: [
      {
        dia: "segunda",
        itens: [
          { nome: "Filé mignon à parmegiana", desc: "Salada, arroz e fritas.", preco: 44 },
          { nome: "Frango à parmegiana", desc: "Salada, arroz e fritas.", preco: 33 },
        ],
      },
      {
        dia: "terca",
        itens: [
          { nome: "Frango à Marie", desc: "Filé de frango ao molho branco, salada, arroz à grega e fritas.", preco: 34 },
          { nome: "Strogonoff de mignon", desc: "Salada de maionese, arroz e batata palha.", preco: 38 },
        ],
      },
      {
        dia: "quarta",
        itens: [
          { nome: "Picadinho de contra filé", desc: "Salada, arroz, feijão tropeiro ou em caldo e fritas.", preco: 38 },
          { nome: "Picadinho à carioca", desc: "Ao molho madeira, com arroz, feijão tropeiro, pastel de carne e banana à milanesa.", preco: 46 },
        ],
      },
      {
        dia: "quinta",
        itens: [
          { nome: "Virado à paulista", desc: "Carré suíno, arroz, tutu de feijão, couve, ovo frito, banana à milanesa e fritas.", preco: 42 },
        ],
      },
      {
        dia: "sexta",
        itens: [
          { nome: "Peixe à milanesa", desc: "Salada, molho de queijo, purê de batatas e arroz à grega.", preco: 38 },
          { nome: "Polpetone", desc: "Coberto com molho de tomate e muçarela. Salada, arroz, feijão e purê de batatas.", preco: 38 },
        ],
      },
      // Sábado e domingo nascem vazios de propósito: os pratos ainda não foram
      // levantados com a cozinha. Dia sem prato simplesmente não é impresso.
      { dia: "sabado", itens: [] },
      { dia: "domingo", itens: [] },
    ],
  },
};
