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
  salao: MenuSalao;
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

// ---------------------------------------------------------------------------
// Menu do salão — 9 folhas A4 soltas (capa "Nossa história", 7 folhas e a folha
// extra de domingo). Formato herdado da peça impressa da Versão 3.

export type ItemSalao = {
  nome: string;
  desc?: string;
  /** "4 unidades", "500 g" — aparece antes da descrição. */
  unidade?: string;
  /** "Quinta a domingo" — quando o prato é servido. Sai em âmbar. */
  dia?: string;
  /** Um preço, ou dois quando a seção tem duas colunas (1/2 pessoas, meia/inteira). */
  precos: (number | null)[];
};

export type SecaoSalao = {
  id: string;
  /** Ausente quando o título da folha já nomeia a seção (ex.: Carnes). */
  titulo?: string;
  nota?: string;
  /** Rótulos das duas colunas de preço, quando houver. */
  colunas?: [string, string];
  itens: ItemSalao[];
};

/** Uma folha impressa: diagramação + quais seções entram nela. */
export type FolhaSalao = {
  titulo: string;
  /** Classes de variação da folha: "justa", "domingo", "historia", "semnumero". */
  variantes: string[];
  /** Arranjo do miolo: "", "hist", "lq" (lista + quadro), "duas-col". */
  miolo: string;
  quadro: boolean;
  /** Folha que abre com cabeçalho grande (a de domingo). */
  abre?: boolean;
  eyebrow?: string;
  frase?: string;
  rodapeN?: string;
  /** Frase no pé do bloco verde desta folha. Nem toda folha usa a frase da casa. */
  fecho?: string;
  /** Colunas da folha: cada grupo é uma coluna, na ordem. A divisão varia por
   *  folha (1/2, 2/1, 1/1), por isso não dá para partir a lista ao meio. */
  grupos: string[][];
  /** Seções que vão dentro do bloco verde. */
  quadroSecoes: string[];
  /** Todas as seções da folha, achatadas — conveniência para o painel. */
  secoes: string[];
};

export type MenuSalao = {
  frase: string;
  historia: string[];
  folhas: FolhaSalao[];
  secoes: SecaoSalao[];
};

/** Qual peça o painel está editando. */
export const PECAS = ["executivo", "salao", "domingo"] as const;
export type Peca = (typeof PECAS)[number];

export const ROTULO_PECA: Record<Peca, { nome: string; descricao: string; imprimir: string }> = {
  executivo: {
    nome: "Menu executivo",
    descricao: "Pratos do almoço de segunda a sexta e os especiais de cada dia.",
    imprimir: "/imprimir/executivo",
  },
  salao: {
    nome: "Menu do salão",
    descricao: "O cardápio completo: 8 folhas, da história às bebidas.",
    imprimir: "/imprimir/salao",
  },
  domingo: {
    nome: "Especiais de domingo",
    descricao: "A folha extra que entra na pasta só aos domingos.",
    imprimir: "/imprimir/domingo",
  },
};

/** O preço de um item do salão, já formatado, ou "" quando não houver. */
export function precoSalao(item: ItemSalao, coluna: number): string {
  const v = item.precos[coluna];
  return v === null || v === undefined ? "" : formatarPreco(v);
}
