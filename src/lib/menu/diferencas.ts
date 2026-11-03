// Descreve em português o que mudou entre duas versões do cardápio, para o
// registro do painel. Pratos são reconhecidos pelo nome: renomear um prato
// aparece como "tirou X" + "incluiu Y".

import { ROTULO_DIA, type Item, type ItemSalao, type MenuExecutivo, type MenuSalao } from "./tipos";

const LIMITE = 60;

const reais = (v: number | null | undefined) =>
  typeof v === "number" ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "sem preço";

const precosSalao = (p: (number | null)[]) => p.map(reais).join(" / ");

type Comparavel = { nome: string; desc?: string; preco: string; extra?: string };

// Nome repetido na mesma seção (dois "Heineken", long neck e 600 ml) vira
// "Heineken", "Heineken#2"... para cada um ser comparado com o seu par.
function comChave(itens: Comparavel[]) {
  const vistos = new Map<string, number>();
  return itens.map((i) => {
    const n = (vistos.get(i.nome) ?? 0) + 1;
    vistos.set(i.nome, n);
    return { ...i, chave: n > 1 ? `${i.nome}#${n}` : i.nome };
  });
}

function compararItens(onde: string, antesBruto: Comparavel[], depoisBruto: Comparavel[], saida: string[]) {
  const antes = comChave(antesBruto);
  const depois = comChave(depoisBruto);
  const porChave = new Map(antes.map((i) => [i.chave, i]));
  const novos = new Set(depois.map((i) => i.chave));

  for (const i of depois) {
    const velho = porChave.get(i.chave);
    if (!velho) {
      saida.push(`${onde}: incluiu "${i.nome}" (${i.preco})`);
      continue;
    }
    if (velho.preco !== i.preco) saida.push(`${onde}: "${i.nome}" — preço ${velho.preco} → ${i.preco}`);
    if ((velho.desc ?? "") !== (i.desc ?? "")) saida.push(`${onde}: "${i.nome}" — descrição alterada`);
    if ((velho.extra ?? "") !== (i.extra ?? "")) saida.push(`${onde}: "${i.nome}" — dia/unidade alterados`);
  }
  for (const i of antes) if (!novos.has(i.chave)) saida.push(`${onde}: tirou "${i.nome}"`);

  const ordemAntes = antes.filter((i) => novos.has(i.chave)).map((i) => i.chave);
  const ordemDepois = depois.filter((i) => porChave.has(i.chave)).map((i) => i.chave);
  if (ordemAntes.join("|") !== ordemDepois.join("|")) saida.push(`${onde}: mudou a ordem dos pratos`);
}

const doExecutivo = (i: Item): Comparavel => ({ nome: i.nome, desc: i.desc, preco: reais(i.preco) });
const doSalao = (i: ItemSalao): Comparavel => ({
  nome: i.nome,
  desc: i.desc,
  preco: precosSalao(i.precos),
  extra: [i.dia, i.unidade].filter(Boolean).join(" · "),
});

function cortar(saida: string[]): string[] {
  return saida.length > LIMITE ? [...saida.slice(0, LIMITE), `… e mais ${saida.length - LIMITE} alterações`] : saida;
}

export function diferencasExecutivo(antes: MenuExecutivo, depois: MenuExecutivo): string[] {
  const saida: string[] = [];
  if (antes.titulo !== depois.titulo) saida.push(`Título: "${antes.titulo}" → "${depois.titulo}"`);
  if (antes.horario !== depois.horario) saida.push(`Horário: "${antes.horario}" → "${depois.horario}"`);
  if (antes.frase !== depois.frase) saida.push("Frase da capa alterada");

  for (const s of depois.secoes) {
    const velha = antes.secoes.find((x) => x.id === s.id);
    const onde = s.titulo || s.id;
    if (!velha) {
      saida.push(`Criou a categoria "${onde}"`);
      continue;
    }
    if (velha.titulo !== s.titulo) saida.push(`Categoria "${velha.titulo}" renomeada para "${s.titulo}"`);
    if ((velha.nota ?? "") !== (s.nota ?? "")) saida.push(`${onde}: nota alterada`);
    compararItens(onde, velha.itens.map(doExecutivo), s.itens.map(doExecutivo), saida);
  }
  for (const s of antes.secoes)
    if (!depois.secoes.some((x) => x.id === s.id)) saida.push(`Removeu a categoria "${s.titulo || s.id}"`);

  for (const dia of Object.keys(ROTULO_DIA) as (keyof typeof ROTULO_DIA)[]) {
    const a = antes.especiais.find((e) => e.dia === dia)?.itens ?? [];
    const d = depois.especiais.find((e) => e.dia === dia)?.itens ?? [];
    compararItens(`Especiais · ${ROTULO_DIA[dia]}`, a.map(doExecutivo), d.map(doExecutivo), saida);
  }
  return cortar(saida);
}

export function diferencasSalao(antes: MenuSalao, depois: MenuSalao): string[] {
  const saida: string[] = [];
  if (antes.frase !== depois.frase) saida.push("Frase da casa alterada");
  if (antes.historia.join("\n") !== depois.historia.join("\n")) saida.push("Texto de \"Nossa história\" alterado");

  for (const f of depois.folhas) {
    const velha = antes.folhas.find((x) => x.titulo === f.titulo);
    if (!velha) {
      saida.push(`Nova folha "${f.titulo.replace(/\n/g, " ")}"`);
      continue;
    }
    if ((velha.eyebrow ?? "") !== (f.eyebrow ?? "") || (velha.frase ?? "") !== (f.frase ?? ""))
      saida.push(`Folha "${f.titulo.replace(/\n/g, " ")}": chamada ou frase alterada`);
  }
  for (const f of antes.folhas)
    if (!depois.folhas.some((x) => x.titulo === f.titulo)) saida.push(`Folha "${f.titulo.replace(/\n/g, " ")}" saiu do cardápio`);

  // seção sem título é nomeada pela folha (ex.: a folha "Carnes")
  const nome = (m: MenuSalao, id: string, titulo?: string) =>
    titulo || m.folhas.find((f) => f.secoes.includes(id))?.titulo.replace(/\n/g, " ") || id;

  for (const s of depois.secoes) {
    const velha = antes.secoes.find((x) => x.id === s.id);
    const onde = nome(depois, s.id, s.titulo);
    if (!velha) {
      saida.push(`Criou a categoria "${onde}"`);
      continue;
    }
    if ((velha.titulo ?? "") !== (s.titulo ?? "")) saida.push(`Categoria "${velha.titulo ?? velha.id}" renomeada para "${onde}"`);
    if ((velha.nota ?? "") !== (s.nota ?? "")) saida.push(`${onde}: nota alterada`);
    compararItens(onde, velha.itens.map(doSalao), s.itens.map(doSalao), saida);
  }
  for (const s of antes.secoes)
    if (!depois.secoes.some((x) => x.id === s.id)) saida.push(`Removeu a categoria "${nome(antes, s.id, s.titulo)}"`);

  return cortar(saida);
}
