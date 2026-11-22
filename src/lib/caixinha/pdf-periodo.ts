// O PDF de "Pagar período": os números do alto, quanto cada um recebe e o dia
// a dia, de um período ainda aberto (prévia) ou de um pagamento feito. Folhas
// A4; quando a tabela passa de uma folha, o cabeçalho dela se repete.

import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { WORDMARK_SVG } from "./marca-svg";
import { rotuloData } from "@/lib/posts/tipos";
import { altoSvg, BRANCO, CAFE, dataCompleta, desenharSvg, LINHA, seguro, TINTA, VERDE } from "./comprovante";
import { curto } from "./periodo";
import { reais, ROTULO_TURNO, type LinhaPagamento, type Turno } from "./tipos";

export type PdfPeriodo = {
  ini: string;
  fim: string;
  turno?: Turno;
  /** null = prévia: os dias ainda estão abertos e os valores podem mudar. */
  pago: { em: string; por: string } | null;
  /** Os quatro números do alto da tela; o último vai em destaque. */
  numeros: { titulo: string; valor: string; sub: string }[];
  /** A taxa de cada turno já formatada ("R$ 10,00", "já pago", "—"); pessoas e consumo só na prévia, como na tela. */
  dias: { data: string; almoco: string; jantar: string; pessoas?: number; consumo?: number }[];
  linhas: LinhaPagamento[];
};

const VERMELHO = rgb(0xa8 / 255, 0x32 / 255, 0x1f / 255);
const VERDE_FUNDO = rgb(0xe9 / 255, 0xf1 / 255, 0xec / 255);

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/** "Período: 16/11/2026 a 21/11/2026" ou "Dia: sábado, 21/11/2026 · Almoço" */
const titulo = (p: PdfPeriodo) =>
  (p.ini === p.fim
    ? `Dia: ${rotuloData(p.ini)}/${p.ini.slice(0, 4)}`
    : `Período: ${dataCompleta(p.ini)} a ${dataCompleta(p.fim)}`) + (p.turno ? ` · ${ROTULO_TURNO[p.turno]}` : "");

export const nomeArquivoPeriodo = (p: PdfPeriodo) =>
  `caixinha-${p.pago ? "pagamento" : "previa"}-${p.ini === p.fim ? p.ini : `${p.ini}-a-${p.fim}`}${p.turno ? `-${p.turno}` : ""}.pdf`;

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function pdfPeriodo(p: PdfPeriodo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Caixinha · ${titulo(p)}`);
  doc.setAuthor("Nikola's Restaurante");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const serifa = await doc.embedFont(StandardFonts.TimesRoman);

  const L = 595; // A4
  const A = 842;
  const M = 40; // margem
  const FAIXA = 72;
  const BAIXO = 44; // o conteúdo para aqui; abaixo fica o rodapé

  let pg = doc.addPage([L, A]);
  let y = A;

  const largura = (s: string, f: PDFFont, t: number) => f.widthOfTextAtSize(seguro(s), t);
  const texto = (s: string, x: number, yy: number, f: PDFFont, t: number, cor = TINTA) =>
    pg.drawText(seguro(s), { x, y: yy, size: t, font: f, color: cor });
  const direita = (s: string, x: number, yy: number, f: PDFFont, t: number, cor = TINTA) =>
    texto(s, x - largura(s, f, t), yy, f, t, cor);
  const traco = (yy: number, cor = LINHA, espessura = 0.75) =>
    pg.drawLine({ start: { x: M, y: yy }, end: { x: L - M, y: yy }, thickness: espessura, color: cor });

  /** Garante `h` pontos livres abaixo da linha atual; se não couber, passa para outra folha. */
  const caber = (h: number, depois?: () => void) => {
    if (y - h >= BAIXO) return;
    pg = doc.addPage([L, A]);
    y = A - M;
    depois?.();
  };

  // faixa verde com o logotipo, como no comprovante
  pg.drawRectangle({ x: 0, y: A - FAIXA, width: L, height: FAIXA, color: VERDE });
  const LW = 150;
  desenharSvg(pg, WORDMARK_SVG, (L - LW) / 2, A - (FAIXA - altoSvg(WORDMARK_SVG, LW)) / 2, LW, BRANCO);

  y = A - FAIXA - 26;
  texto(
    p.pago ? "PAGAMENTO DA CAIXINHA" : "PRÉVIA DO PAGAMENTO DA CAIXINHA · AINDA NÃO FECHADO",
    M,
    y,
    negrito,
    7.5,
    p.pago ? CAFE : VERDE,
  );
  y -= 22;
  texto(titulo(p), M, y, negrito, 16);
  y -= 16;
  texto(
    p.pago
      ? `Pago em ${quando(p.pago.em)} por ${p.pago.por}.`
      : `Prévia de ${quando(new Date().toISOString())}. Os valores podem mudar até o fechamento.`,
    M,
    y,
    normal,
    9.5,
    CAFE,
  );
  y -= 20;

  // os números do alto
  const G = 10;
  const TW = (L - 2 * M - G * (p.numeros.length - 1)) / p.numeros.length;
  const TH = 50;
  p.numeros.forEach((n, i) => {
    const x = M + i * (TW + G);
    const destaque = i === p.numeros.length - 1;
    pg.drawRectangle({
      x,
      y: y - TH,
      width: TW,
      height: TH,
      borderColor: destaque ? VERDE : LINHA,
      borderWidth: 0.75,
      ...(destaque ? { color: VERDE_FUNDO } : {}),
    });
    texto(n.titulo.toUpperCase(), x + 10, y - 14, negrito, 6.5, CAFE);
    texto(n.valor, x + 10, y - 30, negrito, 13);
    texto(n.sub, x + 10, y - 42, normal, 7, CAFE);
  });
  y -= TH + 26;

  // título + cabeçalho + duas linhas, para o título não ficar sozinho no pé da folha
  const secao = (nome: string) => {
    caber(80);
    texto(nome, M, y, serifa, 16);
    y -= 20;
  };

  /** A 1ª coluna à esquerda; as outras alinhadas à direita, a última na margem. */
  const tabela = (cabec: string[], linhas: { celulas: string[]; nota?: string }[], ultimaNegrito: boolean) => {
    const W = 80;
    const n = cabec.length - 1;
    const borda = (i: number) => L - M - (n - 1 - i) * W;
    const cabecalho = () => {
      texto(cabec[0], M, y, negrito, 8, CAFE);
      cabec.slice(1).forEach((h, i) => direita(h, borda(i), y, negrito, 8, CAFE));
      y -= 7;
      traco(y);
      y -= 14;
    };
    cabecalho();
    linhas.forEach((l, k) => {
      const h = l.nota ? 28 : 18;
      caber(l.nota ? 14 : 4, cabecalho);
      texto(l.celulas[0], M, y, normal, 9.5);
      l.celulas.slice(1).forEach((c, i) => direita(c, borda(i), y, ultimaNegrito && i === n - 1 ? negrito : normal, 9.5));
      if (l.nota) direita(l.nota, borda(n - 1), y - 11, normal, 7.5, VERMELHO);
      if (k < linhas.length - 1) traco(y - h + 12, LINHA, 0.5);
      y -= h;
    });
  };

  // quanto cada um recebe
  secao(p.pago ? "Quanto cada um recebeu" : "Pagamento do período");
  if (p.linhas.length) {
    tabela(
      ["Pessoa", "Almoço", "Jantar", "Consumo", "Saldo anterior", p.pago ? "Recebeu" : "Recebe"],
      p.linhas.map((l) => ({
        celulas: [
          l.nome,
          l.almoco ? reais(l.almoco) : "—",
          l.jantar ? reais(l.jantar) : "—",
          l.consumo ? `- ${reais(l.consumo)}` : "—",
          l.saldoAnterior ? reais(l.saldoAnterior) : "—",
          reais(l.pagar),
        ],
        ...(l.novoSaldo < 0 ? { nota: `fica devendo ${reais(-l.novoSaldo)}` } : {}),
      })),
      true,
    );
    caber(12);
    traco(y + 11, TINTA, 1);
    y -= 6;
    texto(p.pago ? "Total pago" : "Total a pagar", M, y, negrito, 10.5);
    direita(reais(p.linhas.reduce((s, l) => s + l.pagar, 0)), L - M, y, negrito, 12.5);
    y -= 30;
  } else {
    texto("Ninguém marcado nesses dias ainda.", M, y, normal, 9.5, CAFE);
    y -= 30;
  }

  // dia a dia
  const comPessoas = p.dias.some((d) => d.pessoas !== undefined);
  secao(p.pago ? "Dias do pagamento" : "Dia a dia");
  tabela(
    ["Dia", "Almoço", "Jantar", ...(comPessoas ? ["Pessoas", "Consumo"] : [])],
    p.dias.map((d) => ({
      celulas: [
        maiuscula(curto(d.data)),
        d.almoco,
        d.jantar,
        ...(comPessoas ? [String(d.pessoas ?? 0), d.consumo ? reais(d.consumo) : "—"] : []),
      ],
    })),
    false,
  );

  // rodapé de cada folha
  const folhas = doc.getPages();
  const marca = seguro(`Nikola's Restaurante · Caixinha · ${titulo(p)}`);
  folhas.forEach((f, i) => {
    f.drawLine({ start: { x: M, y: 34 }, end: { x: L - M, y: 34 }, thickness: 0.5, color: LINHA });
    f.drawText(marca, { x: M, y: 22, size: 7.5, font: normal, color: CAFE });
    const num = `Folha ${i + 1} de ${folhas.length}`;
    f.drawText(num, { x: L - M - normal.widthOfTextAtSize(num, 7.5), y: 22, size: 7.5, font: normal, color: CAFE });
  });

  return doc.save();
}
