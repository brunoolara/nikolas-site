// Converte o menu-salao.html (Versão 3) no arquivo de carga inicial do site.
// Uso: node gera-seed-salao.mjs <menu-salao.html> <saida.ts>
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(process.argv[2], "utf8");

// ---- SECOES
const ini = html.indexOf("const SECOES = {");
const fim = html.indexOf("\n};", ini);
const SECOES = eval("(" + html.slice(ini + "const SECOES = ".length, fim + 2) + ")");

// ---- folhas: <section class="page folha ..."> com header, miolo e data-secao
const folhas = [];
const re = /<section class="page folha([^"]*)">([\s\S]*?)<\/section>\s*(?=<!--|<section class="page|<script|<\/body>)/g;
for (const m of html.matchAll(re)) {
  const variantes = m[1].trim().split(/\s+/).filter(Boolean);
  const corpo = m[2];
  const titulo = (corpo.match(/<h2>([\s\S]*?)<\/h2>/) || [, ""])[1].replace(/<br\s*\/?>/g, "\n").trim();
  const miolo = (corpo.match(/<div class="miolo([^"]*)"/) || [, ""])[1].trim();
  const secoes = [...corpo.matchAll(/data-secao="([^"]+)"/g)].map((x) => x[1]);
  const quadro = /class="quadro"/.test(corpo);

  // Como as seções se distribuem: cada <div> filho do miolo é uma coluna, e o
  // <aside class="quadro"> é o bloco verde. A divisão varia por folha (1/2, 2/1,
  // 1/1), então não dá para partir a lista ao meio.
  const grupos = [];
  let quadroSecoes = [];
  const linhas = (corpo.match(/<div class="miolo[^"]*">([\s\S]*?)\n  <\/div>/) || [, ""])[1].split("\n");
  let atual = null;
  let dentroQuadro = false;
  for (const linha of linhas) {
    const abreDiv = /^\s{4}<div>/.test(linha);
    const abreAside = /^\s{4}<aside/.test(linha);
    const fecha = /^\s{4}<\/(div|aside)>/.test(linha);
    if (abreAside) { dentroQuadro = true; atual = null; }
    else if (abreDiv) { atual = []; grupos.push(atual); }
    else if (fecha) { dentroQuadro = false; atual = null; continue; }
    // a seção pode estar na mesma linha do <div> que a envolve
    const m = linha.match(/data-secao="([^"]+)"/);
    if (!m) continue;
    if (dentroQuadro) quadroSecoes.push(m[1]);
    else if (atual) atual.push(m[1]);
    else grupos.push([m[1]]);           // seção solta, sem <div> em volta
  }
  // a folha de domingo abre com cabeçalho próprio: chamada, frase e marca no rodapé
  const abre = /<header class="abre">/.test(corpo);
  const eyebrow = (corpo.match(/<p class="eyebrow">([\s\S]*?)<\/p>/) || [, ""])[1].replace(/<[^>]+>/g, "").trim();
  const frase = (corpo.match(/<p class="frase">([\s\S]*?)<\/p>/) || [, ""])[1].replace(/<[^>]+>/g, "").trim();
  const rodapeN = (corpo.match(/<span class="n">([\s\S]*?)<\/span>/) || [, ""])[1].trim();
  // cada folha pode ter um fecho próprio (a capa e a de "aves" têm frases diferentes)
  const fecho = (corpo.match(/<p class="fecho">([\s\S]*?)<\/p>/) || [, ""])[1]
    .replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  folhas.push({ variantes, titulo, miolo, secoes, grupos, quadroSecoes, quadro, abre, eyebrow, frase, rodapeN, fecho });
}

// ---- "Nossa história": parágrafos da primeira folha
const blocoHist = html.match(/<div class="texto">([\s\S]*?)<\/div>/);
const historia = [...blocoHist[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
  m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
);

// ---- frase da casa
const frase = (html.match(/<p class="fecho">([\s\S]*?)<\/p>/) || [, ""])[1]
  .replace(/<br\s*\/?>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// ---- gera o TS
const j = (v) => JSON.stringify(v);
const item = (it) => {
  const partes = [`nome: ${j(it.n)}`];
  if (it.d) partes.push(`desc: ${j(it.d)}`);
  if (it.u) partes.push(`unidade: ${j(it.u)}`);
  if (it.dia) partes.push(`dia: ${j(it.dia)}`);
  partes.push(`precos: [${it.p.map((p) => (p === null || p === undefined ? "null" : p)).join(", ")}]`);
  return `      { ${partes.join(", ")} },`;
};

const secoes = Object.entries(SECOES).map(([id, s]) => {
  const linhas = [`    {`, `      id: ${j(id)},`];
  if (s.titulo) linhas.push(`      titulo: ${j(s.titulo)},`);
  if (s.nota) linhas.push(`      nota: ${j(s.nota)},`);
  if (s.colunas) linhas.push(`      colunas: [${s.colunas.map(j).join(", ")}],`);
  linhas.push(`      itens: [`, ...s.itens.map(item), `      ],`, `    },`);
  return linhas.join("\n");
});

const ts = `// Carga inicial do menu do salão: extraído do menu-salao.html da Versão 3
// (Desktop\\Nikolas\\Cardápio\\Salão\\Versão 3), que era a fonte da peça impressa.
// Gerado por scripts/gera-seed-salao.mjs — não editar à mão; a edição de verdade
// acontece no painel, e o que vale passa a ser o arquivo no Blob.

import type { MenuSalao } from "./tipos";

export const SALAO_INICIAL: MenuSalao = {
  frase: ${j(frase)},
  historia: [
${historia.map((p) => `    ${j(p)},`).join("\n")}
  ],
  folhas: [
${folhas
  .map(
    (f) =>
      `    { titulo: ${j(f.titulo)}, variantes: [${f.variantes.map(j).join(", ")}], miolo: ${j(f.miolo)}, quadro: ${f.quadro}` +
      `${f.abre ? ", abre: true" : ""}${f.eyebrow ? `, eyebrow: ${j(f.eyebrow)}` : ""}` +
      `${f.frase ? `, frase: ${j(f.frase)}` : ""}${f.rodapeN ? `, rodapeN: ${j(f.rodapeN)}` : ""}` +
      `${f.fecho ? `, fecho: ${j(f.fecho)}` : ""}` +
      `, grupos: [${f.grupos.map((g) => "[" + g.map(j).join(", ") + "]").join(", ")}]` +
      `, quadroSecoes: [${f.quadroSecoes.map(j).join(", ")}]` +
      `, secoes: [${f.secoes.map(j).join(", ")}] },`,
  )
  .join("\n")}
  ],
  secoes: [
${secoes.join("\n")}
  ],
};
`;

writeFileSync(process.argv[3], ts);
console.log("folhas:", folhas.length);
folhas.forEach((f, i) =>
  console.log(`  ${i}. ${(f.titulo.replace(/\n/g, " ") || "(sem título)").padEnd(30)} miolo="${f.miolo}" quadro=${f.quadro} [${f.secoes.join(", ")}]`),
);
console.log("\nparágrafos da história:", historia.length);
console.log("frase:", frase);
console.log("seções:", Object.keys(SECOES).length, "| itens:", Object.values(SECOES).reduce((a, s) => a + s.itens.length, 0));
console.log("escrito em", process.argv[3]);
