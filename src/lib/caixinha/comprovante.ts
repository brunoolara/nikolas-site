// Comprovante de uma pessoa na Caixinha: os dias, o que ganhou em cada um e o
// total. Sai como texto (para o WhatsApp) e como PDF. Vem de um pagamento já
// fechado ou, antes de fechar, é uma prévia calculada na hora com os dias abertos.

import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { MONOGRAMA_SVG, WORDMARK_SVG } from "./marca-svg";
import { rotuloData } from "@/lib/posts/tipos";
import { lerDias, lerEquipe, lerEstado, lerPagamento } from "./armazem";
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
  const dias = (await lerDias(pag.dias))
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
  const [dias, equipe, estado] = await Promise.all([lerDias(datas), lerEquipe(), lerEstado()]);
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

export type Coluna = "almoco" | "jantar" | "consumo";
export const ROTULO_COLUNA: Record<Coluna, string> = { almoco: "Almoço", jantar: "Jantar", consumo: "Consumo" };

/** Só as colunas que tiveram valor em algum dia: sem coluna de traços na tabela. */
export const colunasDe = (c: Comprovante): Coluna[] =>
  (["almoco", "jantar", "consumo"] as const).filter((k) => c.dias.some((d) => d[k]));

/** "Segunda, 23/11" */
export const rotuloDia = (data: string) => {
  const r = rotuloData(data);
  return r.charAt(0).toUpperCase() + r.slice(1);
};

/** "Seg, 23/11": para a tabela quando ela tem muitas colunas. */
export const rotuloDiaCurto = (data: string) => {
  const r = rotuloDia(data);
  return r.replace(/^([^\s,]{3})[^\s,]*,/, "$1,");
};

/** "23/11 a 26/11/2026", ou "Quarta, 25/11/2026" num dia só; com o turno no fim. */
export const quandoCurto = (c: Comprovante) =>
  (c.ini === c.fim
    ? `${rotuloDia(c.ini)}/${c.ini.slice(0, 4)}`
    : `${dataCompleta(c.ini).slice(0, 5)} a ${dataCompleta(c.fim)}`) + (c.turno ? ` · ${ROTULO_TURNO[c.turno]}` : "");

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

export const VERDE = rgb(0x1e / 255, 0x4b / 255, 0x39 / 255);
export const TINTA = rgb(0x1b / 255, 0x17 / 255, 0x10 / 255);
export const CAFE = rgb(0x6b / 255, 0x60 / 255, 0x55 / 255);
export const LINHA = rgb(0xe2 / 255, 0xda / 255, 0xcb / 255);
const PRETO = rgb(0, 0, 0);
export const BRANCO = rgb(1, 1, 1);

export const RODAPE = "Taxa de serviço dividida entre a equipe que trabalhou no período e turno.";

/** As fontes padrão do PDF só têm o alfabeto latino básico (WinAnsi). */
export const seguro = (s: string) => s.replace(/−/g, "-").replace(/[^\x20-\x7e -ÿ·–—]/g, "");

/**
 * Desenha um SVG do logotipo (grupos com translate, paths e rects) em vetor,
 * com `largura` pontos e o canto de cima à esquerda em (x, topo).
 */
export function desenharSvg(pg: PDFPage, svg: string, x: number, topo: number, largura: number, cor: RGB) {
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

export const altoSvg = (svg: string, largura: number) => {
  const [, , l, a] = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
  return (a * largura) / l;
};

/**
 * O PDF que a pessoa recebe (redesenho de 26/11/2026): bate o olho e entende.
 * A ordem é a da tela: o valor primeiro, grande e em verde; de quem e de quando;
 * os dias numa tabela só com as colunas que tiveram valor; a conta até o total;
 * e no pé quem pagou e quando. Uma família de letra (Helvetica), três tamanhos,
 * duas cores de texto (tinta e café) e o verde só na marca e no valor.
 */
export async function pdfComprovante(c: Comprovante): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Caixinha · ${c.nome} · ${periodo(c)}`);
  doc.setAuthor("Nikola's Restaurante");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);

  const L = 420; // largura (A5)
  const M = 36; // margem
  const FAIXA = 96;
  const LINHA_DIA = 21;
  const varios = c.ini !== c.fim && c.dias.length > 0;
  const colunas = colunasDe(c);
  const l = c.linha;
  const contas = [l.almoco, l.jantar, l.consumo, l.saldoAnterior].filter(Boolean).length;
  const altura = Math.max(
    595,
    FAIXA + 170 + (varios ? 30 + c.dias.length * LINHA_DIA : 0) + contas * 20 + 60 + (l.novoSaldo < 0 ? 20 : 0) + 90,
  );
  const pg = doc.addPage([L, altura]);

  const largura = (s: string, f: PDFFont, t: number) => f.widthOfTextAtSize(seguro(s), t);
  const texto = (s: string, x: number, y: number, f: PDFFont, t: number, cor = TINTA) =>
    pg.drawText(seguro(s), { x, y, size: t, font: f, color: cor });
  const direita = (s: string, x: number, y: number, f: PDFFont, t: number, cor = TINTA) =>
    texto(s, x - largura(s, f, t), y, f, t, cor);
  const traco = (y: number, cor = LINHA, espessura = 0.75) =>
    pg.drawLine({ start: { x: M, y }, end: { x: L - M, y }, thickness: espessura, color: cor });

  // os três tamanhos: rótulo pequeno, texto e o valor em destaque
  const T_ROTULO = 7.5;
  const T_TEXTO = 10.5;
  const T_VALOR = 30;

  // faixa verde com o logotipo oficial
  pg.drawRectangle({ x: 0, y: altura - FAIXA, width: L, height: FAIXA, color: VERDE });
  const LW = 170;
  desenharSvg(pg, WORDMARK_SVG, (L - LW) / 2, altura - (FAIXA - altoSvg(WORDMARK_SVG, LW)) / 2, LW, BRANCO);

  // o valor primeiro
  let y = altura - FAIXA - 34;
  texto(c.pago ? "COMPROVANTE DA CAIXINHA" : "PRÉVIA DA CAIXINHA · AINDA NÃO FECHADA", M, y, negrito, T_ROTULO, CAFE);
  y -= 36;
  texto(reais(l.pagar), M, y, negrito, T_VALOR, VERDE);
  y -= 22;
  const por = c.pago ? "Recebido por " : "A receber por ";
  texto(por, M, y, normal, T_TEXTO, CAFE);
  texto(c.nome, M + largura(por, normal, T_TEXTO), y, negrito, T_TEXTO);
  y -= 15;
  texto(quandoCurto(c), M, y, normal, T_TEXTO, CAFE);
  y -= 26;
  traco(y);

  // os dias: só as colunas que tiveram valor, todas alinhadas à direita
  if (varios) {
    const comTotal = colunas.length > 1;
    const cab = [...colunas.map((k) => ROTULO_COLUNA[k]), ...(comTotal ? ["Total"] : [])];
    const W = 74;
    const xCol = cab.map((_, i) => L - M - (cab.length - 1 - i) * W);
    y -= 18;
    texto("DIA", M, y, negrito, T_ROTULO, CAFE);
    cab.forEach((h, i) => direita(h.toUpperCase(), xCol[i], y, negrito, T_ROTULO, CAFE));
    y -= 8;
    for (const d of c.dias) {
      y -= LINHA_DIA - 6;
      texto(cab.length >= 3 ? rotuloDiaCurto(d.data) : rotuloDia(d.data), M, y, normal, T_TEXTO);
      colunas.forEach((k, i) =>
        direita(d[k] ? (k === "consumo" ? `- ${reais(d[k])}` : reais(d[k])) : "-", xCol[i], y, normal, T_TEXTO, d[k] ? TINTA : CAFE),
      );
      if (comTotal) direita(reais(totalDia(d)), xCol[cab.length - 1], y, normal, T_TEXTO);
      y -= 6;
      traco(y, LINHA, 0.5);
    }
  }

  // a conta até o total
  y -= 22;
  const conta = (rotulo: string, valor: string) => {
    texto(rotulo, M, y, normal, T_TEXTO, CAFE);
    direita(valor, L - M, y, normal, T_TEXTO);
    y -= 20;
  };
  if (l.almoco) conta(varios ? "Almoço no período" : "Almoço", reais(l.almoco));
  if (l.jantar) conta(varios ? "Jantar no período" : "Jantar", reais(l.jantar));
  if (l.consumo) conta("Consumo descontado", `- ${reais(l.consumo)}`);
  if (l.saldoAnterior) conta("Saldo anterior", `- ${reais(-l.saldoAnterior)}`);
  traco(y + 12, TINTA, 1);
  y -= 6;
  texto(c.pago ? "Recebe" : "A receber", M, y, negrito, T_TEXTO);
  direita(reais(l.pagar), L - M, y, negrito, T_TEXTO);
  if (l.novoSaldo < 0) {
    y -= 22;
    texto(`Fica para descontar no próximo pagamento: ${reais(-l.novoSaldo)}`, M, y, normal, T_TEXTO, CAFE);
  }

  // pé: de onde vem o dinheiro, quem pagou e quando, e o monograma
  const MW = 30;
  desenharSvg(pg, MONOGRAMA_SVG, L - M - MW, 32 + MW, MW, PRETO);
  texto(RODAPE, M, 50, normal, T_ROTULO, CAFE);
  texto(rodape(c), M, 38, normal, T_ROTULO, CAFE);

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
