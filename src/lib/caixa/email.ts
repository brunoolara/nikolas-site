// Lê o e-mail "Conferência de caixa" que a Takeat manda ao fechar o caixa
// (de naoresponda@takeat.app para nikolas@). O HTML é sempre o mesmo modelo:
// o texto vira uma lista de pedaços, na ordem em que aparece, e cada parte é
// procurada pelo rótulo. Antes de aceitar, as somas são conferidas contra os
// totais do próprio e-mail: se algo não bater, devolve o erro em vez de números.
//
// Exemplo real em 25/11/2026: abertura R$ 109,00; Dinheiro sistema 383,30,
// usuário 428,00, dif. 44,70; Total no Caixa 4087,60; sangria 22:31 motoboy 27,00.
// O "Sistema" do Dinheiro já é o esperado na gaveta (abertura + vendas em
// dinheiro − sangrias); o "Usuário" é o que o caixa contou, abertura inclusa.

export type Linha = { nome: string; sistema: number; usuario: number };
export type Movimento = { quando: string; descricao: string; valor: number };

export type Fechamento = {
  /** Id da mensagem no Gmail: o mesmo e-mail nunca entra duas vezes. */
  id: string;
  /** Data e hora locais (Ouro Fino), AAAA-MM-DDTHH:MM. */
  aberto: string;
  fechado: string;
  abertoPor: string;
  fechadoPor: string;
  abertura: number;
  metodos: Linha[];
  /** "Total no Caixa" da coluna Sistema. */
  total: number;
  sangrias: Movimento[];
  reforcos: Movimento[];
  /** "Fundo de caixa final (Dinheiro)": o que o caixa contou. */
  fundoFinal: number;
  /** "Diferença de caixa (Dinheiro)": contado − esperado. */
  diferenca: number;
};

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** O texto do HTML em pedaços, sem o <style> nem as tags. */
export function pedacos(html: string): string[] {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&(#\d+|[a-z]+);/gi, (_, e: string) =>
      e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : (ENTIDADES[e.toLowerCase()] ?? `&${e};`),
    )
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** "R$ 1,234.56", "-3431.60" → número. null se não for número. */
function numero(s: string | undefined): number | null {
  if (!s) return null;
  const limpo = s.replace(/R\$/i, "").replace(/,/g, "").trim();
  return /^-?\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : null;
}

/** "25/11/2026 - 19:00" → "2026-11-25T19:00". */
function dataHora(s: string | undefined): string | null {
  const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2}:\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}` : null;
}

const centavos = (n: number) => Math.round(n * 100);
const bate = (a: number, b: number) => Math.abs(centavos(a) - centavos(b)) <= 1;

/** Os pares "descrição / R$ valor" entre dois rótulos (sangrias ou reforços). */
function movimentos(p: string[], de: number, ate: number): Movimento[] | string {
  const lista: Movimento[] = [];
  for (let i = de; i < ate; i += 2) {
    const valor = numero(p[i + 1]);
    const m = p[i].match(/^(\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2})(?: - (.*))?$/);
    if (valor === null || !m) return `não entendi a linha "${p[i]}"`;
    lista.push({ quando: dataHora(m[1])!, descricao: (m[2] ?? "").trim(), valor });
  }
  return lista;
}

export function lerFechamento(id: string, html: string): { ok: true; fechamento: Fechamento } | { ok: false; erro: string } {
  const p = pedacos(html);
  const depois = (rotulo: string | RegExp, desde = 0) => {
    const i = p.findIndex((s, j) => j >= desde && (typeof rotulo === "string" ? s === rotulo : rotulo.test(s)));
    return i < 0 ? -1 : i;
  };
  const falta = (o: string) => ({ ok: false as const, erro: `não achei ${o} no e-mail` });

  if (depois("FECHAMENTO DE CAIXA") < 0) return falta("o título FECHAMENTO DE CAIXA");
  const iAberto = depois("Aberto em:");
  const iFechado = depois("Fechado em:");
  const aberto = dataHora(p[iAberto + 1]);
  const fechado = dataHora(p[iFechado + 1]);
  if (iAberto < 0 || !aberto) return falta("a data de abertura");
  if (iFechado < 0 || !fechado) return falta("a data de fechamento");

  const iAbertoPor = depois("Aberto por:");
  const iFechadoPor = depois("Fechado por:");
  const iAbertura = depois(/^Valor de Abertura/);
  const abertura = numero(p[iAbertura + 1]);
  if (iAbertura < 0 || abertura === null) return falta("o valor de abertura");

  // a tabela: cabeçalho de 4 colunas, depois linhas de 4 até "Total no Caixa"
  const iCab = depois("Dif. R$");
  const iTotal = depois("Total no Caixa");
  if (iCab < 0 || iTotal < 0) return falta("a tabela de formas de pagamento");
  if ((iTotal - iCab - 1) % 4 !== 0) return { ok: false, erro: "a tabela de formas de pagamento veio com colunas a mais ou a menos" };
  const metodos: Linha[] = [];
  for (let i = iCab + 1; i < iTotal; i += 4) {
    const [nome, s, u, d] = [p[i], numero(p[i + 1]), numero(p[i + 2]), numero(p[i + 3])];
    if (s === null || u === null || d === null) return { ok: false, erro: `não entendi a linha "${nome}" da tabela` };
    metodos.push({ nome, sistema: s, usuario: u });
  }
  const total = numero(p[iTotal + 1]);
  if (total === null) return falta("o Total no Caixa");

  const iSangrias = depois("Sangrias", iTotal);
  const iReforcos = depois("Reforços", iTotal);
  const iFundo = depois(/^Fundo de caixa final/);
  const iDif = depois(/^Diferença de caixa/);
  if (iSangrias < 0 || iReforcos < 0 || iFundo < 0 || iDif < 0) return falta("sangrias, reforços ou o fundo final");
  const totalSangrias = numero(p[iSangrias + 1]);
  const totalReforcos = numero(p[iReforcos + 1]);
  const fundoFinal = numero(p[iFundo + 1]);
  const diferenca = numero(p[iDif + 1]);
  if (totalSangrias === null || totalReforcos === null || fundoFinal === null || diferenca === null)
    return falta("os valores de sangrias, reforços ou fundo final");
  const sangrias = movimentos(p, iSangrias + 2, iReforcos);
  const reforcos = movimentos(p, iReforcos + 2, iFundo);
  if (typeof sangrias === "string") return { ok: false, erro: `sangrias: ${sangrias}` };
  if (typeof reforcos === "string") return { ok: false, erro: `reforços: ${reforcos}` };

  // conferências: se o modelo do e-mail mudar, para aqui em vez de mostrar errado
  const soma = (l: { valor: number }[]) => l.reduce((s, x) => s + x.valor, 0);
  if (!metodos.length) return { ok: false, erro: "a tabela veio sem formas de pagamento" };
  if (!bate(metodos.reduce((s, m) => s + m.sistema, 0), total))
    return { ok: false, erro: "a soma das formas de pagamento não bate com o Total no Caixa" };
  if (!bate(soma(sangrias), totalSangrias)) return { ok: false, erro: "a soma das sangrias não bate com o total" };
  if (!bate(soma(reforcos), totalReforcos)) return { ok: false, erro: "a soma dos reforços não bate com o total" };

  return {
    ok: true,
    fechamento: {
      id,
      aberto,
      fechado,
      abertoPor: iAbertoPor < 0 ? "" : p[iAbertoPor + 1],
      fechadoPor: iFechadoPor < 0 ? "" : p[iFechadoPor + 1],
      abertura,
      metodos,
      total,
      sangrias,
      reforcos,
      fundoFinal,
      diferenca,
    },
  };
}

/** Sangria do troco que fica para o próximo caixa ("Fundo próximo caixa", "troco"...). */
export const ehFundo = (m: Movimento) => /fundo|troco/i.test(m.descricao);

const tem = (nome: string, re: RegExp) => re.test(nome.normalize("NFD").replace(/[̀-ͯ]/g, ""));

/** Os grupos do resumo dos gestores. Forma de pagamento nova cai em "Outros". */
export function resumir(f: Fechamento) {
  const grupos = { credito: 0, debito: 0, pix: 0, voucher: 0, online: 0, prazo: 0, outros: 0 };
  let esperado = 0;
  for (const m of f.metodos) {
    const n = m.nome;
    if (tem(n, /^dinheiro$/i)) esperado += m.sistema;
    // "Pagamento Online Takeat" e "Cartão de Crédito Online": pagos pela internet, não na maquininha
    else if (tem(n, /online/i)) grupos.online += m.sistema;
    else if (tem(n, /credito/i)) grupos.credito += m.sistema;
    else if (tem(n, /debito/i)) grupos.debito += m.sistema;
    else if (tem(n, /pix/i)) grupos.pix += m.sistema;
    else if (tem(n, /voucher|ticket|vale|alimenta|refei|sodexo|pluxee|alelo|vr\b/i)) grupos.voucher += m.sistema;
    else if (tem(n, /prazo/i)) grupos.prazo += m.sistema;
    else grupos.outros += m.sistema;
  }
  const fundo = f.sangrias.filter(ehFundo);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  for (const k of Object.keys(grupos) as (keyof typeof grupos)[]) grupos[k] = r2(grupos[k]);
  esperado = r2(esperado);
  return {
    ...grupos,
    /** O que devia estar na gaveta: o "Sistema" do Dinheiro. */
    esperado,
    /** O dinheiro que vai para o gestor: o esperado, já sem o fundo do próximo caixa (que é sangria). */
    aEntregar: esperado,
    fundoProximo: r2(fundo.reduce((s, m) => s + m.valor, 0)),
    outrasSangrias: f.sangrias.filter((m) => !ehFundo(m)),
  };
}

/** "Almoço" se abriu antes das 16h, senão "Jantar". */
export const turnoDe = (f: Pick<Fechamento, "aberto">) => (Number(f.aberto.slice(11, 13)) < 16 ? "Almoço" : "Jantar");
