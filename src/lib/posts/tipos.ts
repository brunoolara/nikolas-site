// Posts prontos para a equipe publicar no status do WhatsApp.
//
// Um post com `data` é da agenda (sai naquele dia); sem `data`, fica no
// banco de posts e pode ser usado a qualquer momento, quantas vezes quiser.

export type Publicacao = { quando: string; por: string };

export type Post = {
  id: string;
  titulo: string;
  /** "AAAA-MM-DD", ou null para o banco de posts. */
  data: string | null;
  legenda?: string;
  /** Nomes dos arquivos em posts/img/, na ordem em que vão para o status. */
  imagens: string[];
  criadoEm: string;
  publicacoes: Publicacao[];
};

export const NOME_IMAGEM = /^[0-9a-f-]{36}\.(jpg|png)$/;
export const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Hoje no fuso do restaurante, como "AAAA-MM-DD". */
export function hoje(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** A data "AAAA-MM-DD" deslocada em `n` dias. */
export function somarDias(data: string, n: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "sexta, 10/10" */
export function rotuloData(data: string): string {
  const [a, m, d] = data.split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d, 12));
  const semana = dia.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" }).replace("-feira", "");
  return `${semana}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/** { semana: "seg", dia: "12" } — para a faixa de dias. */
export function rotuloCurto(data: string): { semana: string; dia: string } {
  const [a, m, d] = data.split("-").map(Number);
  const semana = new Date(Date.UTC(a, m - 1, d, 12))
    .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
    .replace(".", "");
  return { semana, dia: String(d).padStart(2, "0") };
}
