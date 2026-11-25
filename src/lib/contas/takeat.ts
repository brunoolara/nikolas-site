// Contas a pagar lidas da Takeat. A Takeat é o único cadastro: o painel só
// lê e, no "Paguei", dá a baixa (PATCH). A API não cria lançamento, então
// conta nova continua sendo lançada lá (nota pelo Manifesto, o resto como
// lançamento avulso, com a chave Pix ou o código do boleto em "Linha digitável").

import "server-only";
import { takeatGet, takeatPatch } from "@/lib/takeat/cliente";
import { hoje as hojeBrasil, somarDias } from "@/lib/posts/tipos";

type Ref = { id: number; name: string | null } | null;

type Bruto = {
  id: number;
  entry_type: string;
  description: string | null;
  information: string | null;
  value: string;
  paid: boolean;
  due_date: string;
  paid_at: string | null;
  category: string;
  provider: { id: number; name: string | null } | null;
  bank_account: Ref;
  payment_method: Ref;
  invoice: { numero: string | null } | null;
  items?: Bruto[];
};

export type Conta = {
  id: number;
  /** Fornecedor ou, sem ele, a descrição. */
  titulo: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  /** "Insumos: Carnes"; nota com itens de várias categorias vira a lista delas. */
  categorias: { nome: string; valor: number }[];
  forma: string | null;
  formaId: number | null;
  contaId: number | null;
  /** O que foi colado em "Linha digitável". */
  codigo: string;
  nota: string | null;
  /** Lançada como avulso no Caixa Diário (sangria do PDV). */
  caixaDiario: boolean;
};

export type Opcao = { id: number; nome: string };

/** Primeira lista que vier no corpo: a API responde array puro ou dentro de uma chave. */
function lista<T>(corpo: unknown, chaves: string[]): T[] {
  if (Array.isArray(corpo)) return corpo as T[];
  for (const k of chaves) {
    const v = (corpo as Record<string, unknown> | null)?.[k];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

function normalizar(b: Bruto): Conta {
  const filhos = (b.items ?? []).filter((i) => Number(i.value) > 0);
  const partes = filhos.length ? filhos : [b];
  // Os itens nem sempre somam o valor da conta (despesa da nota sem item,
  // bonificação descontada): o que se paga é repartido na proporção dos itens.
  const somaItens = partes.reduce((s, i) => s + Number(i.value), 0);
  const fator = somaItens > 0 ? Number(b.value) / somaItens : 1;
  const porCategoria = new Map<string, number>();
  for (const i of partes) {
    const nome = i.category || "Sem categoria";
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + Number(i.value) * fator);
  }
  const descricao = (b.description ?? "").trim();
  return {
    id: b.id,
    titulo: b.provider?.name?.trim() || descricao || "Sem descrição",
    descricao,
    valor: Number(b.value),
    vencimento: b.due_date.slice(0, 10),
    pago: b.paid,
    categorias: [...porCategoria].map(([nome, valor]) => ({ nome, valor })),
    forma: b.payment_method?.name ?? null,
    formaId: b.payment_method?.id ?? null,
    contaId: b.bank_account?.id ?? null,
    codigo: (b.information ?? "").trim(),
    nota: b.invoice?.numero ?? null,
    caixaDiario: b.entry_type === "standalone" && descricao.startsWith("Caixa Diário"),
  };
}

/** Despesas com vencimento entre `ini` e `fim` (até 92 dias), todas as páginas. */
async function despesas(ini: string, fim: string, pago?: boolean): Promise<Conta[]> {
  const contas: Conta[] = [];
  for (let offset = 0, pagina = 0; pagina < 20; pagina++) {
    const corpo = await takeatGet<{ remaining?: number; pagination?: { has_more?: boolean } }>(
      "/v1/financial/cash-flows",
      {
        start_date: ini,
        end_date: fim,
        date_type: "due_date",
        is_earning: "false",
        ...(pago === undefined ? {} : { paid: String(pago) }),
        offset,
      },
    );
    const itens = lista<Bruto>(corpo, ["cash_flows", "data", "items"]);
    contas.push(...itens.map(normalizar));
    offset += itens.length;
    const falta = corpo.remaining ?? (corpo.pagination?.has_more ? 1 : 0);
    if (!itens.length || falta <= 0) break;
  }
  return contas.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || b.valor - a.valor);
}

/** Até 30 dias para trás aparece na lista; o que for mais velho só é contado. */
export const DIAS_ATRAS = 30;
const DIAS_FRENTE = 60;

// Uma leitura por minuto basta: a lista muda quando alguém lança na Takeat
// ou paga por aqui (aí a memória é limpa). Poupa a Takeat de quem atualiza
// a tela várias vezes (limite de 10 consultas por minuto).
let memoria: { quando: number; valor: Promise<Abertas> } | null = null;

export type Abertas = { contas: Conta[]; antigas: { quantas: number; valor: number } };

async function lerAbertasAgora(): Promise<Abertas> {
  const dia = hojeBrasil();
  const ini = somarDias(dia, -DIAS_ATRAS);
  const [contas, velhas] = await Promise.all([
    despesas(ini, somarDias(dia, DIAS_FRENTE), false),
    despesas(somarDias(dia, -DIAS_ATRAS - 90), somarDias(dia, -DIAS_ATRAS - 1), false),
  ]);
  // a Takeat já filtra pelo período; conferir aqui evita contar a mesma conta nos dois
  const antigas = velhas.filter((c) => c.vencimento < ini);
  return {
    contas: contas.filter((c) => c.vencimento >= ini),
    antigas: { quantas: antigas.length, valor: antigas.reduce((s, c) => s + c.valor, 0) },
  };
}

/** Em aberto: vencidas há até 30 dias e as dos próximos 60. */
export function lerAbertas(): Promise<Abertas> {
  if (memoria && Date.now() - memoria.quando < 60_000) return memoria.valor;
  const valor = lerAbertasAgora();
  memoria = { quando: Date.now(), valor };
  valor.catch(() => (memoria = null));
  return valor;
}

/** Todas as despesas que vencem no mês "AAAA-MM", pagas ou não. */
export function lerMes(mes: string): Promise<Conta[]> {
  const [a, m] = mes.split("-").map(Number);
  const fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  return despesas(`${mes}-01`, fim);
}

// Contas do banco e formas de pagamento quase nunca mudam.
let opcoes: { quando: number; valor: Promise<{ contas: Opcao[]; formas: Opcao[] }> } | null = null;

export function lerOpcoes(): Promise<{ contas: Opcao[]; formas: Opcao[] }> {
  if (opcoes && Date.now() - opcoes.quando < 6 * 3_600_000) return opcoes.valor;
  const como = (x: { id: number; name: string }) => ({ id: x.id, nome: x.name });
  const valor = Promise.all([
    takeatGet<unknown>("/v1/financial/bank-accounts"),
    takeatGet<unknown>("/v1/financial/payment-methods"),
  ]).then(([c, f]) => ({
    contas: lista<{ id: number; name: string }>(c, ["data", "items", "bank_accounts"]).map(como),
    formas: lista<{ id: number; name: string }>(f, ["data", "items", "payment_methods"]).map(como),
  }));
  opcoes = { quando: Date.now(), valor };
  valor.catch(() => (opcoes = null));
  return valor;
}

/** Marca como pago (ou desfaz) na Takeat. A lista é relida na próxima abertura. */
export async function darBaixa(
  id: number,
  baixa: { pago: true; dia: string; contaId: number; formaId: number | null } | { pago: false },
): Promise<void> {
  await takeatPatch(
    `/v1/financial/cash-flows/${id}`,
    baixa.pago
      ? {
          paid: true,
          paid_at: baixa.dia,
          bank_account_id: baixa.contaId,
          cash_flow_payment_method_id: baixa.formaId,
        }
      : { paid: false },
  );
  memoria = null;
}
