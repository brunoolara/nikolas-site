// Caixinha do turno: a tela que fica logada no PC do restaurante quando o
// Bruno não está (pedido de 12/11/2026). Mostra só o turno de agora (almoço
// até as 16h, depois o jantar): quem trabalhou, a taxa da Takeat menos os 5%
// da casa e quanto cada um recebe. Quem está no PC marca a presença (cada um
// entra com o % padrão dele) e pode fechar e pagar o turno. Taxa digitada,
// % diferente, consumo, outros dias e reabrir ficam só na Caixinha do Bruno.

import Cabecalho from "@/components/painel/Cabecalho";
import AutoAtualizar from "@/app/operacao/AutoAtualizar";
import { exigir } from "@/lib/acessos/sessao";
import { rotuloData } from "@/lib/posts/tipos";
import { lerDia, lerEquipe, lerEstado, lerPagamento } from "@/lib/caixinha/armazem";
import { taxaDoDia } from "@/lib/caixinha/takeat";
import {
  arredondar,
  calcularDia,
  PARTE_EQUIPE,
  pctPadrao,
  repartir,
  ROTULO_TURNO,
  turnoAgora,
} from "@/lib/caixinha/tipos";
import Tela, { type PessoaTela } from "./Tela";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export default async function CaixinhaDoTurno() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("caixinha-turno")).liberado) return null;

  const { data, turno } = turnoAgora();
  const [dia, equipe, estado] = await Promise.all([lerDia(data), lerEquipe(), lerEstado()]);
  const tp = dia.turnoPago;
  const pagoNoTurno = tp?.turno === turno ? tp : null;
  const pagamentoId = pagoNoTurno?.pagamento ?? dia.fechamento?.pagamento ?? null;
  const pago = pagoNoTurno ?? dia.fechamento ?? null;
  const presencas = dia.turnos[turno].presencas;

  // a taxa: congelada se já foi pago; senão a digitada pelo Bruno ou a da Takeat
  let taxa: number | null;
  let origem = "";
  if (pagoNoTurno) taxa = pagoNoTurno.taxa;
  else if (dia.fechamento) taxa = dia.fechamento.taxa[turno];
  else if (dia.turnos[turno].taxaManual !== null) {
    taxa = dia.turnos[turno].taxaManual;
    origem = "Lançada pelo Bruno.";
  } else {
    const tk = await taxaDoDia(data);
    taxa = tk.ok ? tk.taxa[turno] : null;
    origem = tk.ok
      ? `Da Takeat: ${tk.comandas[turno]} ${tk.comandas[turno] === 1 ? "comanda paga" : "comandas pagas"} até agora.`
      : `Sem a taxa da Takeat agora (${tk.motivo}).`;
  }

  // quanto cada um recebe: do pagamento feito, ou a conta do turno aberto
  const pagamento = pagamentoId ? await lerPagamento(pagamentoId) : null;
  const recebe = new Map<string, { valor: number; descontou: boolean }>();
  if (pago) {
    // dia fechado inteiro com o jantar junto: a parte do turno vem do fechamento
    const congeladas = pagoNoTurno ? pagoNoTurno.partes : dia.fechamento!.partes;
    for (const p of congeladas) recebe.set(p.pessoa, { valor: p[turno], descontou: false });
    if (pagamento?.turno === turno)
      for (const l of pagamento.linhas) recebe.set(l.pessoa, { valor: l.pagar, descontou: l.pagar < l[turno] });
  } else if (taxa !== null) {
    for (const l of calcularDia(dia, { almoco: 0, jantar: 0, [turno]: taxa }, equipe, estado.saldos, [turno]))
      recebe.set(l.pessoa, { valor: l.pagar, descontou: l.pagar < l[turno] });
  }
  const partes = repartir(taxa ?? 0, presencas);

  const pessoas: PessoaTela[] = equipe
    .filter((p) => p.ativo || presencas.some((x) => x.id === p.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p) => {
      const pct = presencas.find((x) => x.id === p.id)?.pct ?? null;
      return {
        id: p.id,
        nome: p.nome,
        presente: pct !== null,
        pct: pct ?? pctPadrao(p, data),
        parte: partes.get(p.id) ?? 0,
        recebe: recebe.get(p.id)?.valor ?? partes.get(p.id) ?? 0,
        descontou: recebe.get(p.id)?.descontou ?? false,
      };
    });

  const titulo = `${ROTULO_TURNO[turno]} · ${rotuloData(data)}`;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Caixinha do turno"
        descricao="Marque quem trabalhou neste turno. No fim, feche e pague."
        acoes={<AutoAtualizar lidoEm={new Date().toISOString()} />}
      />
      <Tela
        data={data}
        turno={turno}
        titulo={titulo}
        taxa={taxa}
        equipeRecebe={taxa === null ? null : arredondar(taxa * PARTE_EQUIPE)}
        origem={origem}
        pessoas={pessoas}
        pago={pago ? { em: hora(pago.em), por: pago.por } : null}
      />
    </div>
  );
}
