// O PDF da tela "Pagar período": ?ini=&fim= para o período ainda aberto (a
// mesma conta da tela, só quando dá para fechar) ou ?id= de um pagamento feito.

import { pode } from "@/lib/acessos/sessao";
import { hoje } from "@/lib/posts/tipos";
import { lerDias, lerEstado, lerPagamento } from "@/lib/caixinha/armazem";
import { fonteDe } from "@/lib/caixinha/comprovante";
import { curto, montarPeriodo, taxasNoPagamento } from "@/lib/caixinha/periodo";
import { nomeArquivoPeriodo, pdfPeriodo, type PdfPeriodo } from "@/lib/caixinha/pdf-periodo";
import { PARTE_EQUIPE, reais, ROTULO_TURNO, TURNOS } from "@/lib/caixinha/tipos";

export async function GET(req: Request) {
  if (!(await pode("caixinha"))) return new Response("Entre com usuário e senha.", { status: 401 });
  const fonte = fonteDe(new URL(req.url).searchParams);
  if (!fonte || ("turno" in fonte && fonte.turno)) return new Response("Endereço inválido.", { status: 400 });

  const dados = "id" in fonte ? await doPagamento(fonte.id) : await daPrevia(fonte.ini, fonte.fim);
  if (!dados)
    return new Response("Não deu para gerar o PDF: confira o período na tela da Caixinha.", { status: 404 });

  const pdf = await pdfPeriodo(dados);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivoPeriodo(dados)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** O período aberto, com a mesma conta da tela; só se a tela deixaria fechar. */
async function daPrevia(ini: string, fim: string): Promise<PdfPeriodo | null> {
  if (fim > hoje()) return null;
  const p = await montarPeriodo(ini, fim, await lerEstado());
  if (!p.podeFechar) return null;
  return {
    ini,
    fim,
    pago: null,
    numeros: [
      { titulo: "Dias", valor: String(p.datas.length), sub: `${curto(ini)} a ${curto(fim)}` },
      { titulo: "Taxa de serviço", valor: reais(p.taxaTotal), sub: "almoço + jantar" },
      { titulo: "Para a equipe", valor: reais(p.taxaTotal * PARTE_EQUIPE), sub: "A parte da equipe na taxa" },
      { titulo: "A pagar", valor: reais(p.total), sub: "já sem consumo e saldo" },
    ],
    dias: p.resumo.map((r) => ({
      data: r.dia.data,
      almoco: r.pagoAntes === "almoco" ? "já pago" : reais(r.taxa.almoco),
      jantar: r.pagoAntes === "jantar" ? "já pago" : reais(r.taxa.jantar),
      pessoas: r.pessoas,
      consumo: r.consumo,
    })),
    linhas: p.linhas,
  };
}

/** Um pagamento já feito, como na tela dele. */
async function doPagamento(id: string): Promise<PdfPeriodo | null> {
  const pag = await lerPagamento(id);
  if (!pag) return null;
  const dias = await lerDias(pag.dias);
  const taxas = dias.map((d) => taxasNoPagamento(d, pag.id));
  const taxaTotal = taxas.reduce((s, t) => s + (t.almoco ?? 0) + (t.jantar ?? 0), 0);
  const total = pag.linhas.reduce((s, l) => s + l.pagar, 0);
  const consumo = pag.linhas.reduce((s, l) => s + l.consumo, 0);
  return {
    ini: pag.ini,
    fim: pag.fim,
    ...(pag.turno ? { turno: pag.turno } : {}),
    pago: { em: pag.em, por: pag.por },
    numeros: [
      { titulo: "Dias", valor: String(pag.dias.length), sub: "no pagamento" },
      {
        titulo: "Taxa de serviço",
        valor: reais(taxaTotal),
        sub: pag.turno ? `só o ${ROTULO_TURNO[pag.turno].toLowerCase()}` : "almoço + jantar",
      },
      { titulo: "Consumo descontado", valor: reais(consumo), sub: "da equipe" },
      { titulo: "Pago", valor: reais(total), sub: `${pag.linhas.filter((l) => l.pagar > 0).length} pessoas` },
    ],
    dias: dias.map((d, i) => {
      const [almoco, jantar] = TURNOS.map((t) => (taxas[i][t] === undefined ? "—" : reais(taxas[i][t]!)));
      return { data: d.data, almoco, jantar };
    }),
    linhas: pag.linhas,
  };
}
