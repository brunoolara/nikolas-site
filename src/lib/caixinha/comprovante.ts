// Comprovante de uma pessoa na Caixinha: os dias, o que ganhou em cada um e o
// total. Sai como texto (para o WhatsApp) e como PDF. Vem de um pagamento já
// fechado ou, antes de fechar, é uma prévia calculada na hora com os dias abertos.

import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { MONOGRAMA_SVG, WORDMARK_SVG } from "./marca-svg";
import { rotuloData } from "@/lib/posts/tipos";
import { lerDia, lerEquipe, lerEstado, lerPagamento } from "./armazem";
import { taxasDoPeriodo } from "./takeat";
import {
  diasEntre,
  MAX_DIAS_PAGAMENTO,
  PAGAMENTO_ID,
  partesDoDia,
  partesNoPagamento,
  reais,
  ROTULO_TURNO,
  somarPagamento,
  TURNOS,
  turnosAbertos,
  type LinhaPagamento,
  type Turno,
} from "./tipos";

export type DiaComprovante = { data: string; almoco: number; jantar: number; consumo: number };

export type Comprovante = {
  nome: string;
  ini: string;
  fim: string;
  /** Comprovante de um turno só. */
  turno?: Turno;
  /** Só os dias em que a pessoa trabalhou ou consumiu. */
  dias: DiaComprovante[];
  linha: LinhaPagamento;
  /** null = prévia: os dias ainda não foram fechados e os valores podem mudar. */
  pago: { id: string; em: string; por: string } | null;
};

export async function lerComprovante(id: string, pessoa: string): Promise<Comprovante | null> {
  const pag = await lerPagamento(id);
  const linha = pag?.linhas.find((l) => l.pessoa === pessoa);
  if (!pag || !linha) return null;
  const dias = (await Promise.all(pag.dias.map(lerDia)))
    .map((d) => {
      const p = partesNoPagamento(d, pag.id).find((x) => x.pessoa === pessoa);
      return p ? { data: d.data, almoco: p.almoco, jantar: p.jantar, consumo: p.consumo } : null;
    })
    .filter((d): d is DiaComprovante => Boolean(d && (d.almoco || d.jantar || d.consumo)));
  return {
    nome: linha.nome,
    ini: pag.ini,
    fim: pag.fim,
    ...(pag.turno ? { turno: pag.turno } : {}),
    dias,
    linha,
    pago: { id: pag.id, em: pag.em, por: pag.por },
  };
}

/**
 * A prévia de quem ainda não recebeu: de `ini` a `fim`, todos abertos, com a
 * mesma conta do pagamento (taxa digitada ou da Takeat, consumo e saldo). Só
 * entram os turnos ainda não pagos; com `turno` (num dia só), só ele.
 */
export async function previaComprovante(
  ini: string,
  fim: string,
  pessoa: string,
  turno?: Turno,
): Promise<Comprovante | null> {
  const datas = diasEntre(ini, fim);
  if (!datas.length || datas.length > MAX_DIAS_PAGAMENTO) return null;
  if (turno && ini !== fim) return null;
  const [dias, equipe, estado] = await Promise.all([Promise.all(datas.map(lerDia)), lerEquipe(), lerEstado()]);
  if (dias.some((d) => d.fechamento)) return null;
  const turnosDe = (d: (typeof dias)[number]) => (turno ? [turno] : turnosAbertos(d));
  if (turno && !turnosAbertos(dias[0]).includes(turno)) return null;
  const precisam = dias.filter((d) => turnosDe(d).some((t) => d.turnos[t].taxaManual === null)).map((d) => d.data);
  const takeat = precisam.length ? await taxasDoPeriodo(precisam) : new Map();
  const partes = dias.map((d) => {
    const tk = takeat.get(d.data);
    const taxa: Record<Turno, number> = { almoco: 0, jantar: 0 };
    for (const t of turnosDe(d)) taxa[t] = d.turnos[t].taxaManual ?? (tk?.ok ? tk.taxa[t] : 0);
    return { data: d.data, partes: partesDoDia(d, taxa, equipe, turnosDe(d)) };
  });
  const linha = somarPagamento(
    partes.map((p) => p.partes),
    estado.saldos,
  ).find((l) => l.pessoa === pessoa);
  if (!linha) return null;
  const porDia = partes
    .map(({ data, partes }) => {
      const p = partes.find((x) => x.pessoa === pessoa);
      return p ? { data, almoco: p.almoco, jantar: p.jantar, consumo: p.consumo } : null;
    })
    .filter((d): d is DiaComprovante => Boolean(d && (d.almoco || d.jantar || d.consumo)));
  return { nome: linha.nome, ini, fim, ...(turno ? { turno } : {}), dias: porDia, linha, pago: null };
}

/** "10/11/2026" */
export const dataCompleta = (d: string) => d.split("-").reverse().join("/");

export const periodo = (c: Comprovante) =>
  (c.ini === c.fim ? `${rotuloData(c.ini)}/${c.ini.slice(0, 4)}` : `${dataCompleta(c.ini)} a ${dataCompleta(c.fim)}`) +
  (c.turno ? ` · ${ROTULO_TURNO[c.turno]}` : "");

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/** Quem pagou e quando, ou o aviso de que ainda é prévia. */
export const rodape = (c: Comprovante) =>
  c.pago
    ? `Pago em ${quando(c.pago.em)} por ${c.pago.por}.`
    : `Prévia de ${quando(new Date().toISOString())}. O valor pode mudar até o fechamento.`;

export const totalDia = (d: DiaComprovante) => d.almoco + d.jantar - d.consumo;

/** O comprovante em texto, com o negrito do WhatsApp. */
export function textoComprovante(c: Comprovante): string {
  const l = c.linha;
  const t: string[] = [
    "*Nikola's Restaurante*",
    c.pago ? "Comprovante da caixinha" : "Prévia da caixinha (ainda não fechada)",
    "",
    `Funcionário: *${c.nome}*`,
  ];
  const datas = c.ini === c.fim ? `Dia: ${rotuloData(c.ini)}/${c.ini.slice(0, 4)}` : `Período: ${dataCompleta(c.ini)} a ${dataCompleta(c.fim)}`;
  t.push(c.turno ? `${datas} · *${ROTULO_TURNO[c.turno]}*` : datas);
  if (c.ini !== c.fim && c.dias.length) {
    t.push("");
    for (const d of c.dias) {
      const partes = [
        d.almoco ? `almoço ${reais(d.almoco)}` : "",
        d.jantar ? `jantar ${reais(d.jantar)}` : "",
        d.consumo ? `consumo - ${reais(d.consumo)}` : "",
      ].filter(Boolean);
      t.push(`${rotuloData(d.data)}: ${partes.join(" · ")} = ${reais(totalDia(d))}`);
    }
  }
  t.push("");
  if (l.almoco) t.push(`Almoço: ${reais(l.almoco)}`);
  if (l.jantar) t.push(`Jantar: ${reais(l.jantar)}`);
  if (l.consumo) t.push(`Consumo descontado: - ${reais(l.consumo)}`);
  if (l.saldoAnterior) t.push(`Saldo anterior: - ${reais(-l.saldoAnterior)}`);
  t.push(`*${c.pago ? "Recebe" : "A receber"}: ${reais(l.pagar)}*`);
  if (l.novoSaldo < 0) t.push(`Fica para descontar no próximo pagamento: ${reais(-l.novoSaldo)}`);
  t.push("", RODAPE);
  return t.join("\n");
}

export function nomeArquivo(c: Comprovante): string {
  const nome = c.nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `caixinha-${c.pago ? "" : "previa-"}${nome || "pessoa"}-${c.ini === c.fim ? c.ini : `${c.ini}-a-${c.fim}`}${c.turno ? `-${c.turno}` : ""}.pdf`;
}

// ---------- PDF ----------

const VERDE = rgb(0x1e / 255, 0x4b / 255, 0x39 / 255);
const TINTA = rgb(0x1b / 255, 0x17 / 255, 0x10 / 255);
const CAFE = rgb(0x6b / 255, 0x60 / 255, 0x55 / 255);
const LINHA = rgb(0xe2 / 255, 0xda / 255, 0xcb / 255);
const PRETO = rgb(0, 0, 0);
const BRANCO = rgb(1, 1, 1);

export const RODAPE = "Taxa de serviço dividida entre a equipe que trabalhou no período e turno.";

/** As fontes padrão do PDF só têm o alfabeto latino básico (WinAnsi). */
const seguro = (s: string) => s.replace(/−/g, "-").replace(/[^\x20-\x7e -ÿ·–—]/g, "");

/**
 * Desenha um SVG do logotipo (grupos com translate, paths e rects) em vetor,
 * com `largura` pontos e o canto de cima à esquerda em (x, topo).
 */
function desenharSvg(pg: PDFPage, svg: string, x: number, topo: number, largura: number, cor: RGB) {
  const [, , vbL] = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
  const s = largura / vbL;
  for (const g of svg.matchAll(/<g transform="translate\(([-\d.]+),([-\d.]+)\)">(.*?)<\/g>/g)) {
    const tx = Number(g[1]);
    const ty = Number(g[2]);
    for (const p of g[3].matchAll(/ d="([^"]+)"/g))
      pg.drawSvgPath(p[1], { x: x + tx * s, y: topo - ty * s, scale: s, color: cor, borderWidth: 0 });
  }
  for (const r of svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/g)) {
    const [rx, ry, rl, ra] = r.slice(1).map(Number);
    pg.drawRectangle({ x: x + rx * s, y: topo - (ry + ra) * s, width: rl * s, height: ra * s, color: cor });
  }
}

const altoSvg = (svg: string, largura: number) => {
  const [, , l, a] = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
  return (a * largura) / l;
};

export async function pdfComprovante(c: Comprovante): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Caixinha · ${c.nome} · ${periodo(c)}`);
  doc.setAuthor("Nikola's Restaurante");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);

  const L = 420; // largura (A5)
  const M = 32; // margem
  const FAIXA = 112;
  const varios = c.ini !== c.fim && c.dias.length > 0;
  const l = c.linha;
  const totais = [l.almoco, l.jantar, l.consumo, l.saldoAnterior].filter(Boolean).length;
  const altura = Math.max(
    595,
    FAIXA + 150 + (varios ? 34 + c.dias.length * 20 : 0) + totais * 22 + 50 + (l.novoSaldo < 0 ? 20 : 0) + 90,
  );
  const pg = doc.addPage([L, altura]);

  const largura = (s: string, f: PDFFont, t: number) => f.widthOfTextAtSize(seguro(s), t);
  const texto = (s: string, x: number, y: number, f: PDFFont, t: number, cor = TINTA) =>
    pg.drawText(seguro(s), { x, y, size: t, font: f, color: cor });
  const direita = (s: string, x: number, y: number, f: PDFFont, t: number, cor = TINTA) =>
    texto(s, x - largura(s, f, t), y, f, t, cor);
  const traco = (y: number, cor = LINHA, espessura = 0.75) =>
    pg.drawLine({ start: { x: M, y }, end: { x: L - M, y }, thickness: espessura, color: cor });

  // faixa verde com o logotipo oficial (wordmark com o filete e "Restaurante · desde 1977")
  pg.drawRectangle({ x: 0, y: altura - FAIXA, width: L, height: FAIXA, color: VERDE });
  const LW = 190;
  desenharSvg(pg, WORDMARK_SVG, (L - LW) / 2, altura - (FAIXA - altoSvg(WORDMARK_SVG, LW)) / 2, LW, BRANCO);

  // o que é este papel
  let y = altura - FAIXA - 26;
  const tipo = c.pago ? "COMPROVANTE DA CAIXINHA" : "PRÉVIA DA CAIXINHA · AINDA NÃO FECHADA";
  texto(tipo, M, y, negrito, 7.5, c.pago ? CAFE : VERDE);
  y -= 30;

  // funcionário e dia/período, com o turno em negrito
  texto("Funcionário:", M, y, normal, 13, CAFE);
  texto(c.nome, M + largura("Funcionário:", normal, 13) + 5, y, negrito, 17);
  y -= 22;
  const quando = `${c.ini === c.fim ? "Dia" : "Período"}: ${
    c.ini === c.fim ? `${rotuloData(c.ini)}/${c.ini.slice(0, 4)}` : `${dataCompleta(c.ini)} a ${dataCompleta(c.fim)}`
  }`;
  texto(quando, M, y, normal, 12.5);
  if (c.turno) {
    const x = M + largura(quando, normal, 12.5);
    texto(" · ", x, y, normal, 12.5, CAFE);
    texto(ROTULO_TURNO[c.turno], x + largura(" · ", normal, 12.5), y, negrito, 12.5);
  }
  y -= 26;

  if (varios) {
    const col = [L - M - 210, L - M - 140, L - M - 70, L - M];
    texto("Dia", M, y, negrito, 8, CAFE);
    ["Almoço", "Jantar", "Consumo", "Total"].forEach((h, i) => direita(h, col[i], y, negrito, 8, CAFE));
    y -= 8;
    traco(y);
    y -= 14;
    for (const d of c.dias) {
      texto(rotuloData(d.data), M, y, normal, 9.5);
      direita(d.almoco ? reais(d.almoco) : "—", col[0], y, normal, 9.5);
      direita(d.jantar ? reais(d.jantar) : "—", col[1], y, normal, 9.5);
      direita(d.consumo ? `- ${reais(d.consumo)}` : "—", col[2], y, normal, 9.5);
      direita(reais(totalDia(d)), col[3], y, normal, 9.5);
      y -= 20;
    }
    y -= 6;
  }

  // totais
  traco(y + 12);
  y -= 6;
  const linhaTotal = (rotulo: string, valor: string) => {
    texto(rotulo, M, y, normal, 10.5, CAFE);
    direita(valor, L - M, y, normal, 10.5);
    y -= 22;
  };
  if (l.almoco) linhaTotal(varios ? "Almoço no período" : "Almoço", reais(l.almoco));
  if (l.jantar) linhaTotal(varios ? "Jantar no período" : "Jantar", reais(l.jantar));
  if (l.consumo) linhaTotal("Consumo descontado", `- ${reais(l.consumo)}`);
  if (l.saldoAnterior) linhaTotal("Saldo anterior", `- ${reais(-l.saldoAnterior)}`);

  // o total: só um filete escuro em cima e o valor em negrito, sem caixa colorida
  traco(y + 13, TINTA, 1);
  y -= 6;
  texto(c.pago ? "Recebe" : "A receber", M, y, negrito, 11.5);
  direita(reais(l.pagar), L - M, y, negrito, 13);
  y -= 26;
  if (l.novoSaldo < 0) texto(`Fica para descontar no próximo pagamento: ${reais(-l.novoSaldo)}`, M, y, normal, 9.5, CAFE);

  // rodapé: a frase e o monograma oficial no canto de baixo, à direita
  const MW = 34;
  desenharSvg(pg, MONOGRAMA_SVG, L - M - MW, 30 + MW, MW, PRETO);
  texto(RODAPE, M, 36, normal, 8, CAFE);

  return doc.save();
}

// ---------- endereço ----------

/** De onde vem o comprovante: um pagamento feito (id) ou um período aberto (ou um turno de um dia). */
export type Fonte = { id: string } | { ini: string; fim: string; turno?: Turno };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function fonteDe(busca: URLSearchParams): Fonte | null {
  const id = busca.get("id");
  if (id) return PAGAMENTO_ID.test(id) ? { id } : null;
  const ini = busca.get("ini") ?? "";
  const fim = busca.get("fim") ?? "";
  const turno = busca.get("turno");
  if (!(DATA.test(ini) && DATA.test(fim) && ini <= fim)) return null;
  if (!turno) return { ini, fim };
  return (TURNOS as string[]).includes(turno) && ini === fim ? { ini, fim, turno: turno as Turno } : null;
}

export const consulta = (f: Fonte, pessoa: string) =>
  `${"id" in f ? `id=${f.id}` : `ini=${f.ini}&fim=${f.fim}${f.turno ? `&turno=${f.turno}` : ""}`}&pessoa=${encodeURIComponent(pessoa)}`;

export const buscarComprovante = (f: Fonte, pessoa: string) =>
  "id" in f ? lerComprovante(f.id, pessoa) : previaComprovante(f.ini, f.fim, pessoa, f.turno);
