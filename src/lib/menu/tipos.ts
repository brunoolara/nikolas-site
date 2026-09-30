// Formato do cardápio editável pelo painel. É este objeto que vai e volta do
// Vercel Blob e alimenta tanto a página de impressão quanto (mais adiante) o site.
//
// Regra de marca: o site público não mostra preço — o preço existe aqui porque a
// peça impressa precisa dele. Ver a memória "nikolas-voz-sem-preco".

/** Dias na ordem em que aparecem na peça. */
export const DIAS = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const;

export type Dia = (typeof DIAS)[number];

export const ROTULO_DIA: Record<Dia, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
};

export type Item = {
  nome: string;
  /** Linha de acompanhamentos, abaixo do nome. Opcional. */
  desc?: string;
  /** Em reais. `null` quando o preço varia e não vai impresso. */
  preco: number | null;
};

export type Secao = {
  id: string;
  titulo: string;
  /** Frase em itálico abaixo do título. */
  nota?: string;
  itens: Item[];
};

/** Um dia do quadro "Especiais do dia". Dia sem prato não é impresso. */
export type Especial = {
  dia: Dia;
  itens: Item[];
};

export type MenuExecutivo = {
  titulo: string;
  /** Ex.: "Segunda a domingo · 11h às 14h". Aparece na capa e no cabeçalho do verso. */
  horario: string;
  /** Frase da capa e do fim do quadro verde. */
  frase: string;
  secoes: Secao[];
  especiais: Especial[];
};

export type Cardapio = {
  /** Sobe a cada gravação; serve para conferir que o painel salvou. */
  versao: number;
  /** ISO 8601. */
  atualizadoEm: string;
  atualizadoPor: string;
  executivo: MenuExecutivo;
};

/** Dias que têm ao menos um prato — os únicos que vão para a peça impressa. */
export function especiaisComPratos(menu: MenuExecutivo): Especial[] {
  const ordem = new Map(DIAS.map((dia, i) => [dia, i]));
  return menu.especiais
    .filter((e) => e.itens.some((i) => i.nome.trim()))
    .map((e) => ({ ...e, itens: e.itens.filter((i) => i.nome.trim()) }))
    .sort((a, b) => (ordem.get(a.dia) ?? 0) - (ordem.get(b.dia) ?? 0));
}

/** "38" -> "38,00" — o impresso mostra o número sem "R$", como no original. */
export function formatarPreco(valor: number | null): string {
  if (valor === null) return "";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
