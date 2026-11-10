// Categorias da contagem de estoque, no estilo do Hawks, e a separação
// automática dos insumos da Takeat pelo nome. O Bruno pode trocar a
// categoria de qualquer item em Estoque > Organizar itens; a troca vence a
// regra daqui. Sem código de servidor: a tela do navegador também usa.

export const CATEGORIAS = [
  "Carnes",
  "Aves e peixes",
  "Frios e laticínios",
  "Hortifrúti",
  "Congelados e prontos",
  "Mercearia",
  "Bebidas",
  "Destilados e vinhos",
  "Limpeza e descartáveis",
  "Outros",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/** Categorias que não entram no CMV (não são mercadoria vendida). */
export const FORA_DO_CMV: Categoria[] = ["Limpeza e descartáveis"];

// A ordem importa: a primeira regra que casar vence ("batata frita" antes de
// "batata", "leite condensado" antes de "leite", "água sanitária" antes de "água").
const REGRAS: [RegExp, Categoria][] = [
  [/sanit[aá]ria|detergente|sab[aã]o|sabonete|tixan|lava roupa|perox|vassoura|papel|guardanapo|descart|embalage|saco|luva/i, "Limpeza e descartáveis"],
  [/vinho (tinto )?\(?cozinha|vinho madeira/i, "Mercearia"],
  [/vodka|whisky|gin |gin$|tanqueray|rum|tequila|campari|martini|cointreau|aperol|conhaque|domecq|steinhaeger|underberg|saqu[eê]|espumante|cacha[çc]a|salinas|seleta|bonito|antenor|boazinha|minas de ouro|vinho|skyy/i, "Destilados e vinhos"],
  [/polpa|coca|guaran[aá]|fanta|sprite|schweppes|t[oô]nica|[aá]gua|h2oh|del valle|red bull|heineken|original|serramalte|corona|stella|malzbier|brahma|chopp|jotaefe|cerveja|refrigerante|suco/i, "Bebidas"],
  [/batata frita|noisette|polenta|bolinho|bolinha|croquete|medalh[aã]o|ravioli|capeletti|nhoque|rondel|manicaretti|congelad|doce de|pipoca|massa para pastel|linguiça de rolo/i, "Congelados e prontos"],
  [/frango|peixe|til[aá]pia|salm[aã]o|camar[aã]o|lula|bacalhau/i, "Aves e peixes"],
  [/picanha|fil[eé] mignon|file mignon|contra fil|bombom|alcatra|patinho|lombo|bisteca|bacon|toucinho|lingui[çc]a|calabresa|l[ií]ngua|bucho|costela|cupim|carne|maminha|fraldinha/i, "Carnes"],
  [/leite condensado|leite de coco/i, "Mercearia"],
  [/queijo|mu[çc]arela|presunto|salame|copa|manteiga|creme de leite|leite|requeij|catupiry|provolone|parmes|gorgonzola|ovos?\b|iogurte/i, "Frios e laticínios"],
  [/pepino em conserva|tomate seco|palmito|milho|ervilha/i, "Mercearia"],
  [/alface|tomate|cebola|alho|batata|cenoura|couve|abacaxi|banana|laranja|lim[aã]o|morango|kiwi|amora|hortel[aã]|salsa|cheiro|r[uú]cula|pepino|piment[aã]o|repolho|berinjela|ab[oó]bora|vagem|folhas|br[oó]colis|mandioca|chuchu|abobrinha|maracuj/i, "Hortifrúti"],
  [/arroz|feij[aã]o|farinha|a[çc][uú]car|\bsal\b|[oó]leo|azeite|molho|shoyu|mostarda|maionese|extrato|gr[aã]o|tahine|trigo|cravo|p[aá]prica|noz|pimenta|tempero|chimichurri|atum|am[eê]ndoa|vinagre|maizena|p[aã]o|panko|gelo/i, "Mercearia"],
];

export function categoriaPeloNome(nome: string): Categoria {
  for (const [regra, categoria] of REGRAS) if (regra.test(nome)) return categoria;
  return "Outros";
}

export const ehCategoria = (c: string): c is Categoria => (CATEGORIAS as readonly string[]).includes(c);

/** Segunda-feira da semana de `data` ("AAAA-MM-DD"). A semana vai de segunda a domingo. */
export function semanaDe(data: string): string {
  const [a, m, d] = data.split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d));
  const recuo = (dia.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(a, m - 1, d - recuo)).toISOString().slice(0, 10);
}

export function somarDias(data: string, n: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "10/11 a 16/11" */
export function rotuloSemana(segunda: string): string {
  const f = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  return `${f(segunda)} a ${f(somarDias(segunda, 6))}`;
}

export type ItemContagem = { id: number; nome: string; unidade: string; categoria: Categoria };

/** Quantidade digitada: aceita vírgula, ponto de milhar e soma ("2+1,5"). */
export function lerQuantidade(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const partes = limpo.split("+").map((p) => Number(p.trim().replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")));
  if (partes.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  return Math.round(partes.reduce((s, n) => s + n, 0) * 1000) / 1000;
}

export const mostrarQuantidade = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(n).replace(".", ",");
