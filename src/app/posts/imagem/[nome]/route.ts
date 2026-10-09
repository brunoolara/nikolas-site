// Entrega uma foto da loja privada, só para quem entrou com uma das senhas.

import { papel } from "@/lib/menu/sessao";
import { lerImagem } from "@/lib/posts/armazem";
import { NOME_IMAGEM } from "@/lib/posts/tipos";

export async function GET(_req: Request, ctx: RouteContext<"/posts/imagem/[nome]">) {
  const { nome } = await ctx.params;
  if (!(await papel())) return new Response("Entre com a senha.", { status: 401 });
  if (!NOME_IMAGEM.test(nome)) return new Response("Não encontrado.", { status: 404 });

  const stream = await lerImagem(nome);
  if (!stream) return new Response("Não encontrado.", { status: 404 });
  return new Response(stream, {
    headers: {
      "Content-Type": "image/jpeg",
      // o nome é único e a foto nunca muda: o celular pode guardar à vontade
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
