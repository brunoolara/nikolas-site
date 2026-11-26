// Chave Pix para receber a caixinha (pedido do Bruno em 25/11/2026) e o
// "Pix copia e cola" com o valor de cada pessoa, para quem paga só colar no
// app do banco. Sem nada de servidor: a tela usa para mostrar, o servidor
// para conferir antes de gravar.
//
// O copia e cola segue o BR Code do Banco Central (EMV, estático): chave,
// valor, nome e cidade, com o CRC16 no fim. O app do banco mostra o nome do
// dono da chave antes de confirmar.

export type TipoChavePix = "cpf" | "celular" | "email" | "cnpj" | "aleatoria";

export const TIPOS_PIX: TipoChavePix[] = ["cpf", "celular", "email", "aleatoria", "cnpj"];

export const ROTULO_PIX: Record<TipoChavePix, string> = {
  cpf: "CPF",
  celular: "Celular",
  email: "E-mail",
  cnpj: "CNPJ",
  aleatoria: "Chave aleatória",
};

/** A chave como o Pix guarda: CPF e CNPJ só números, celular +55DDDNÚMERO, e-mail e chave aleatória em minúsculas. */
export type ChavePix = { tipo: TipoChavePix; chave: string };

const digitos = (s: string) => s.replace(/\D/g, "");

function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[n])) return false;
  }
  return true;
}

function cnpjValido(d: string): boolean {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const n of [12, 13]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * pesos[i + 13 - n];
    const resto = soma % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== Number(d[n])) return false;
  }
  return true;
}

type Conferida = { ok: true; pix: ChavePix } | { ok: false; erro: string };

/** Confere a chave digitada para o tipo escolhido e põe no formato do Pix. */
export function conferirChavePix(tipo: string, digitado: string): Conferida {
  const texto = digitado.trim();
  if (!texto) return { ok: false, erro: "Digite a chave Pix." };
  const ok = (t: TipoChavePix, chave: string): Conferida => ({ ok: true, pix: { tipo: t, chave } });
  switch (tipo) {
    case "cpf": {
      const d = digitos(texto);
      return cpfValido(d) ? ok("cpf", d) : { ok: false, erro: "CPF inválido: confira os 11 números." };
    }
    case "cnpj": {
      const d = digitos(texto);
      return cnpjValido(d) ? ok("cnpj", d) : { ok: false, erro: "CNPJ inválido: confira os 14 números." };
    }
    case "celular": {
      let d = digitos(texto);
      if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
      return d.length === 11 && d[2] === "9"
        ? ok("celular", `+55${d}`)
        : { ok: false, erro: "Celular com DDD: 11 números, como (35) 99999-9999." };
    }
    case "email": {
      const e = texto.toLowerCase();
      return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e) && e.length <= 77
        ? ok("email", e)
        : { ok: false, erro: "E-mail inválido." };
    }
    case "aleatoria": {
      const h = texto.toLowerCase();
      if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/.test(h))
        return { ok: false, erro: "A chave aleatória tem 32 letras e números (36 com os tracinhos)." };
      const s = h.replace(/-/g, "");
      return ok("aleatoria", `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`);
    }
    default:
      return { ok: false, erro: "Escolha o tipo da chave." };
  }
}

/** Para ler na tela: 123.456.789-09, (35) 99999-9999... */
export function mostrarChave(p: ChavePix): string {
  if (p.tipo === "cpf") return p.chave.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (p.tipo === "cnpj") return p.chave.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (p.tipo === "celular") return p.chave.replace(/^\+55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  return p.chave;
}

/** Para o registro do painel: o tipo e o final, nunca a chave inteira ("CPF final 4725"). */
export function resumoChave(p: ChavePix): string {
  if (p.tipo === "email") {
    const [nome, dominio] = p.chave.split("@");
    return `${ROTULO_PIX.email} ${nome.slice(0, 1)}…@${dominio}`;
  }
  return `${ROTULO_PIX[p.tipo]} final ${p.chave.slice(-4)}`;
}

/** Para colar no app do banco: CPF e CNPJ com pontos (não se confundem com celular), celular com +55. */
export const chaveParaCopiar = (p: ChavePix) => (p.tipo === "cpf" || p.tipo === "cnpj" ? mostrarChave(p) : p.chave);

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), o do BR Code. */
function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Nome e cidade no BR Code: sem acento, só letras, números e espaço, em maiúsculas. */
const limpo = (s: string, max: number, padrao: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max)
    .trim() || padrao;

/** O "Pix copia e cola" com a chave e o valor (estático, sem identificador). */
export function pixComValor(p: ChavePix, valor: number, nome: string, cidade = "Ouro Fino"): string {
  const corpo =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", p.chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", limpo(nome, 25, "NIKOLAS")) +
    campo("60", limpo(cidade, 15, "OURO FINO")) +
    campo("62", campo("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}
