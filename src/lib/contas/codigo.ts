// O que a funcionária colou no campo "Linha digitável" da Takeat: código de
// boleto, conta de consumo ou tributo, Pix copia e cola ou uma chave Pix.
// Daqui sai o texto que o botão copia e, quando o próprio código traz, o
// valor e o vencimento, para conferir com a conta lançada. Sem servidor:
// a tela do celular usa o mesmo arquivo.

export type TipoCodigo = "boleto" | "consumo" | "pix" | "chave" | "nenhum";

export type Codigo = {
  tipo: TipoCodigo;
  /** O que vai para a área de transferência. */
  copiar: string;
  /** Valor em reais escrito no código, quando ele traz. */
  valor: number | null;
  /** Vencimento escrito no código (boleto), "AAAA-MM-DD". */
  vencimento: string | null;
};

export const ROTULO_CODIGO: Record<TipoCodigo, string> = {
  boleto: "Boleto",
  consumo: "Conta de consumo ou tributo",
  pix: "Pix copia e cola",
  chave: "Chave Pix",
  nenhum: "Sem código",
};

const dia = (base: string, dias: number) => {
  const [a, m, d] = base.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};
const distancia = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b));

/**
 * Vencimento pelo fator do boleto. O fator chegou a 9999 em 21/02/2025 e
 * recomeçou em 1000 no dia seguinte; vale a leitura mais perto de hoje.
 */
function vencimentoDoFator(fator: number, hoje: string): string | null {
  if (!fator) return null;
  const antigo = dia("1997-10-07", fator);
  const novo = dia("2025-02-22", fator - 1000);
  return distancia(novo, hoje) <= distancia(antigo, hoje) ? novo : antigo;
}

/** Valor (tag 54) de um Pix copia e cola, lendo os campos de primeiro nível. */
function valorDoPix(texto: string): number | null {
  let i = 0;
  while (i + 4 <= texto.length) {
    const id = texto.slice(i, i + 2);
    const tamanho = Number(texto.slice(i + 2, i + 4));
    if (!Number.isInteger(tamanho)) return null;
    const conteudo = texto.slice(i + 4, i + 4 + tamanho);
    if (id === "54") {
      const v = Number(conteudo);
      return Number.isFinite(v) ? v : null;
    }
    i += 4 + tamanho;
  }
  return null;
}

export function lerCodigo(bruto: string | null | undefined, hoje: string): Codigo {
  const texto = (bruto ?? "").trim();
  if (!texto) return { tipo: "nenhum", copiar: "", valor: null, vencimento: null };

  if (texto.startsWith("000201")) return { tipo: "pix", copiar: texto, valor: valorDoPix(texto), vencimento: null };

  const digitos = texto.replace(/\D/g, "");
  const soNumeros = /^[\d\s.\-]+$/.test(texto);

  // Boleto bancário: 47 dígitos; os 14 últimos são o fator de vencimento e o valor.
  if (soNumeros && digitos.length === 47) {
    const valor = Number(digitos.slice(37)) / 100;
    return {
      tipo: "boleto",
      copiar: digitos,
      valor: valor > 0 ? valor : null,
      vencimento: vencimentoDoFator(Number(digitos.slice(33, 37)), hoje),
    };
  }

  // Água, luz, telefone e guias: 48 dígitos começando por 8, em 4 blocos de 11 + dígito.
  if (soNumeros && digitos.length === 48 && digitos.startsWith("8")) {
    const barras = [0, 12, 24, 36].map((i) => digitos.slice(i, i + 11)).join("");
    const emReais = barras[2] === "6" || barras[2] === "8";
    const valor = Number(barras.slice(4, 15)) / 100;
    return { tipo: "consumo", copiar: digitos, valor: emReais && valor > 0 ? valor : null, vencimento: null };
  }

  return { tipo: "chave", copiar: texto, valor: null, vencimento: null };
}
