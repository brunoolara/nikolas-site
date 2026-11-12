// As áreas internas do site. Fora de usuarios.ts para as telas do navegador
// poderem usar sem puxar código de servidor.

export type Area = "cardapio" | "posts" | "caixinha" | "operacao" | "estoque" | "minha-caixinha";

export const AREAS: Area[] = ["cardapio", "posts", "caixinha", "operacao", "estoque", "minha-caixinha"];

export const ROTULO_AREA: Record<Area, string> = {
  cardapio: "Alterar cardápio",
  posts: "Posts do status (só ver, compartilhar e baixar)",
  caixinha: "Caixinha (rateio da taxa de serviço)",
  operacao: "Operação (mesas e delivery ao vivo)",
  estoque: "Estoque (contagem semanal)",
  "minha-caixinha": "Minha caixinha (só a parte da própria pessoa)",
};
