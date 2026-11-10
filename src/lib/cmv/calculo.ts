// Contas do CMV, sem nada de servidor: recebem comandas, custos e contagens
// já lidos e devolvem os números da tela. Regras de faturamento iguais às do
// Hawks (memória do projeto): comanda cancelada ou sem pagamento não conta;
// cashback do Clube não é receita; no salão a taxa de 10% não é receita; no
// delivery vale o total com a entrega. Tudo limitado ao que foi pago.

import type { Comanda } from "@/lib/takeat/comandas";

const num = (v: string | number | null | undefined) => Number(v) || 0;

export type Venda = { id: number; nome: string; qtd: number; receita: number; custoUnit: number | null };

export type Vendas = {
  faturamento: number;
  salao: number;
  delivery: number;
  comandas: number;
  produtos: Venda[];
  /** Complementos vendidos: id → quantidade. */
  complementos: Map<number, number>;
};

/** Faturamento e itens vendidos de um conjunto de comandas. */
export function apurarVendas(comandas: Comanda[]): Vendas {
  let salao = 0;
  let delivery = 0;
  let n = 0;
  const produtos = new Map<number, Venda>();
  const complementos = new Map<number, number>();

  for (const c of comandas) {
    if (c.status === "canceled" || c.delivery_canceled_at) continue;
    const pago = (c.payments ?? [])
      .filter((p) => p.payment_method?.keyword !== "clube")
      .reduce((s, p) => s + num(p.payment_value), 0);
    if (pago <= 0) continue;
    n += 1;
    const ehDelivery = c.is_delivery || c.table?.table_type === "delivery";
    if (ehDelivery) delivery += Math.min(pago, num(c.total_delivery_price) || num(c.total_price));
    else salao += Math.min(pago, num(c.total_price));

    for (const conta of c.bills ?? [])
      for (const cesta of conta.order_baskets ?? []) {
        if (cesta.canceled_at || cesta.order_status === "canceled") continue;
        for (const p of cesta.orders ?? []) {
          if (p.canceled_at || !p.product) continue;
          const v = produtos.get(p.product.id) ?? {
            id: p.product.id,
            nome: p.product.name.trim(),
            qtd: 0,
            receita: 0,
            custoUnit: null,
          };
          v.qtd += p.amount;
          v.receita += num(p.total_price);
          produtos.set(p.product.id, v);
          for (const cc of p.complement_categories ?? [])
            for (const oc of cc.order_complements ?? [])
              complementos.set(oc.complement_id, (complementos.get(oc.complement_id) ?? 0) + oc.amount * p.amount);
        }
      }
  }
  return {
    faturamento: salao + delivery,
    salao,
    delivery,
    comandas: n,
    produtos: [...produtos.values()],
    complementos,
  };
}

export type Custos = { produtos: Record<string, { custo: number; em: string }>; complementos: Record<string, { custo: number; em: string }> };

export type Teorico = {
  custo: number;
  /** Parte do faturamento (pela receita dos itens) com custo de ficha conhecido. */
  cobertura: number;
  itens: (Venda & { custoTotal: number; cmv: number | null })[];
  semCusto: Venda[];
};

/** CMV teórico: o custo da ficha de cada item vendido × quantidade. */
export function cmvTeorico(v: Vendas, custos: Custos): Teorico {
  let custo = 0;
  let receitaCoberta = 0;
  let receitaTotal = 0;
  const itens: Teorico["itens"] = [];
  const semCusto: Venda[] = [];
  for (const p of v.produtos) {
    receitaTotal += p.receita;
    const c = custos.produtos[p.id];
    // custo zero = sem ficha na Takeat (404) ou ficha vazia: não cobre a venda
    if (!c || c.custo <= 0) {
      semCusto.push(p);
      continue;
    }
    const custoTotal = c.custo * p.qtd;
    custo += custoTotal;
    receitaCoberta += p.receita;
    itens.push({ ...p, custoUnit: c.custo, custoTotal, cmv: p.receita > 0 ? custoTotal / p.receita : null });
  }
  for (const [id, qtd] of v.complementos) {
    const c = custos.complementos[id];
    if (c) custo += c.custo * qtd;
  }
  itens.sort((a, b) => b.custoTotal - a.custoTotal);
  semCusto.sort((a, b) => b.receita - a.receita);
  return { custo, cobertura: receitaTotal > 0 ? receitaCoberta / receitaTotal : 0, itens, semCusto };
}

export type Real = { inicial: number; compras: number; final: number; cmv: number };

/** CMV real: estoque inicial + compras − estoque final. */
export const cmvReal = (inicial: number, compras: number, final: number): Real => ({
  inicial,
  compras,
  final,
  cmv: inicial + compras - final,
});

/** Valor de uma contagem: quantidade × custo unitário de cada item. */
export function valorDaContagem(
  qtds: Record<string, number>,
  custoDe: (id: string) => number,
  conta: (id: string) => boolean,
): number {
  return Object.entries(qtds).reduce((s, [id, q]) => (conta(id) ? s + q * custoDe(id) : s), 0);
}

/** Itens de compra de uma NF-e, pelo bloco SPED (linhas C170: insumo e valor). */
export function itensDaNota(sped: string | undefined): { insumo: number; valor: number }[] {
  if (!sped) return [];
  const itens: { insumo: number; valor: number }[] = [];
  for (const linha of sped.split("\n")) {
    if (!linha.startsWith("|C170|")) continue;
    const c = linha.split("|");
    // |C170|NUM_ITEM|COD_ITEM|DESCR|QTD|UNID|VL_ITEM|...
    const insumo = Number(c[3]);
    const valor = Number((c[7] ?? "").replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(insumo) && insumo > 0 && Number.isFinite(valor)) itens.push({ insumo, valor });
  }
  return itens;
}

export const pct = (v: number | null) =>
  v === null || !Number.isFinite(v) ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
