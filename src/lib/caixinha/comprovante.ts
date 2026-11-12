// Comprovante de uma pessoa num pagamento da Caixinha: os dias, o que ganhou
// em cada um e o total recebido. Sai como texto (para o WhatsApp) e como PDF.

import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { rotuloData } from "@/lib/posts/tipos";
import { lerDia, lerPagamento } from "./armazem";
import { reais, type LinhaPagamento } from "./tipos";

export type DiaComprovante = { data: string; almoco: number; jantar: number; consumo: number };

export type Comprovante = {
  idPagamento: string;
  nome: string;
  ini: string;
  fim: string;
  /** Só os dias em que a pessoa trabalhou ou consumiu. */
  dias: DiaComprovante[];
  linha: LinhaPagamento;
  pagoEm: string;
  pagoPor: string;
};

export async function lerComprovante(id: string, pessoa: string): Promise<Comprovante | null> {
  const pag = await lerPagamento(id);
  const linha = pag?.linhas.find((l) => l.pessoa === pessoa);
  if (!pag || !linha) return null;
  const dias = (await Promise.all(pag.dias.map(lerDia)))
    .map((d) => {
      const p = d.fechamento?.partes.find((x) => x.pessoa === pessoa);
      return p ? { data: d.data, almoco: p.almoco, jantar: p.jantar, consumo: p.consumo } : null;
    })
    .filter((d): d is DiaComprovante => Boolean(d && (d.almoco || d.jantar || d.consumo)));
  return { idPagamento: pag.id, nome: linha.nome, ini: pag.ini, fim: pag.fim, dias, linha, pagoEm: pag.em, pagoPor: pag.por };
}

/** "10/11/2026" */
export const dataCompleta = (d: string) => d.split("-").reverse().join("/");

export const periodo = (c: Comprovante) =>
  c.ini === c.fim ? `${rotuloData(c.ini)}/${c.ini.slice(0, 4)}` : `${dataCompleta(c.ini)} a ${dataCompleta(c.fim)}`;

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export const totalDia = (d: DiaComprovante) => d.almoco + d.jantar - d.consumo;

/** O comprovante em texto, com o negrito do WhatsApp. */
export function textoComprovante(c: Comprovante): string {
  const l = c.linha;
  const t: string[] = ["*Nikola's Restaurante*", "Comprovante da caixinha", "", `*${c.nome}*`];
  t.push(c.ini === c.fim ? `Dia: ${periodo(c)}` : `Período: ${periodo(c)}`);
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
  t.push(`*Recebe: ${reais(l.pagar)}*`);
  if (l.novoSaldo < 0) t.push(`Fica para descontar no próximo pagamento: ${reais(-l.novoSaldo)}`);
  t.push("", `Pago em ${quando(c.pagoEm)} por ${c.pagoPor}.`);
  return t.join("\n");
}

export function nomeArquivo(c: Comprovante): string {
  const nome = c.nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `caixinha-${nome || "pessoa"}-${c.ini === c.fim ? c.ini : `${c.ini}-a-${c.fim}`}.pdf`;
}

// ---------- PDF ----------

const VERDE = rgb(0x1e / 255, 0x4b / 255, 0x39 / 255);
const TINTA = rgb(0x1b / 255, 0x17 / 255, 0x10 / 255);
const CAFE = rgb(0x6b / 255, 0x60 / 255, 0x55 / 255);
const LINHA = rgb(0xe2 / 255, 0xda / 255, 0xcb / 255);
const CREME = rgb(0xf1 / 255, 0xeb / 255, 0xdf / 255);

/** As fontes padrão do PDF só têm o alfabeto latino básico (WinAnsi). */
const seguro = (s: string) => s.replace(/−/g, "-").replace(/[^\x20-\x7e -ÿ·–—]/g, "");

export async function pdfComprovante(c: Comprovante): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Caixinha · ${c.nome} · ${periodo(c)}`);
  doc.setAuthor("Nikola's Restaurante");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const marca = await doc.embedFont(StandardFonts.TimesRomanBold);

  const L = 420; // largura (A5)
  const M = 32; // margem
  const varios = c.ini !== c.fim && c.dias.length > 0;
  const l = c.linha;
  const totais = [l.almoco, l.jantar, l.consumo, l.saldoAnterior].filter(Boolean).length + 1;
  const altura = Math.max(595, 300 + (varios ? 40 + c.dias.length * 20 : 0) + totais * 22 + (l.novoSaldo < 0 ? 20 : 0));
  const pg = doc.addPage([L, altura]);

  const texto = (s: string, x: number, y: number, f: PDFFont, t: number, cor = TINTA) =>
    pg.drawText(seguro(s), { x, y, size: t, font: f, color: cor });
  const direita = (s: string, x: number, y: number, f: PDFFont, t: number, cor = TINTA) =>
    texto(s, x - f.widthOfTextAtSize(seguro(s), t), y, f, t, cor);
  const traco = (y: number, p: PDFPage = pg) =>
    p.drawLine({ start: { x: M, y }, end: { x: L - M, y }, thickness: 0.75, color: LINHA });

  // faixa da marca
  pg.drawRectangle({ x: 0, y: altura - 78, width: L, height: 78, color: VERDE });
  const titulo = "NIKOLA'S";
  const espaco = 3;
  let largura = 0;
  for (const ch of titulo) largura += marca.widthOfTextAtSize(ch, 24) + espaco;
  let x = (L - largura + espaco) / 2;
  for (const ch of titulo) {
    pg.drawText(ch, { x, y: altura - 44, size: 24, font: marca, color: rgb(0.98, 0.97, 0.95) });
    x += marca.widthOfTextAtSize(ch, 24) + espaco;
  }
  const sub = "COMPROVANTE DA CAIXINHA";
  pg.drawText(sub, {
    x: (L - normal.widthOfTextAtSize(sub, 8)) / 2,
    y: altura - 62,
    size: 8,
    font: normal,
    color: rgb(0.85, 0.9, 0.87),
  });

  let y = altura - 118;
  texto(c.nome, M, y, negrito, 18);
  y -= 18;
  texto(`${c.ini === c.fim ? "Dia" : "Período"}: ${periodo(c)}`, M, y, normal, 10, CAFE);
  y -= 24;

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
      direita(reais(totalDia(d)), col[3], y, negrito, 9.5);
      y -= 20;
    }
    y -= 6;
  }

  // totais
  const linhaTotal = (rotulo: string, valor: string) => {
    texto(rotulo, M, y, normal, 10.5, CAFE);
    direita(valor, L - M, y, normal, 10.5);
    y -= 22;
  };
  traco(y + 12);
  y -= 6;
  if (l.almoco) linhaTotal(varios ? "Almoço no período" : "Almoço", reais(l.almoco));
  if (l.jantar) linhaTotal(varios ? "Jantar no período" : "Jantar", reais(l.jantar));
  if (l.consumo) linhaTotal("Consumo descontado", `- ${reais(l.consumo)}`);
  if (l.saldoAnterior) linhaTotal("Saldo anterior", `- ${reais(-l.saldoAnterior)}`);

  y -= 10;
  pg.drawRectangle({ x: M, y: y - 14, width: L - 2 * M, height: 38, color: CREME });
  texto("Recebe", M + 12, y, negrito, 13, VERDE);
  direita(reais(l.pagar), L - M - 12, y, negrito, 15, VERDE);
  y -= 40;
  if (l.novoSaldo < 0) {
    texto(`Fica para descontar no próximo pagamento: ${reais(-l.novoSaldo)}`, M, y, normal, 9.5, CAFE);
    y -= 20;
  }

  texto(`Pago em ${quando(c.pagoEm)} por ${c.pagoPor}.`, M, 40, normal, 8.5, CAFE);
  texto("Taxa de serviço dividida entre a equipe que trabalhou em cada turno.", M, 27, normal, 8, CAFE);

  return doc.save();
}
