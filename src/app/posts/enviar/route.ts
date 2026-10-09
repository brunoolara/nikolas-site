// Recebe uma foto do editor de posts. O navegador já manda reduzida para o
// tamanho de status (lado maior 1920 px, JPEG), então cabe folgado no limite
// de 4,5 MB por requisição da Vercel.

import { randomUUID } from "node:crypto";
import { papel } from "@/lib/menu/sessao";
import { gravarImagem } from "@/lib/posts/armazem";

const LIMITE = 4 * 1024 * 1024;

export async function POST(req: Request) {
  if ((await papel()) !== "dono") return Response.json({ erro: "Só o dono envia fotos." }, { status: 403 });

  const arquivo = (await req.formData()).get("foto");
  if (!(arquivo instanceof Blob) || arquivo.type !== "image/jpeg" || arquivo.size > LIMITE) {
    return Response.json({ erro: "Foto inválida ou grande demais." }, { status: 400 });
  }

  const nome = `${randomUUID()}.jpg`;
  try {
    await gravarImagem(nome, arquivo);
    return Response.json({ nome });
  } catch (erro) {
    console.error("falha ao enviar foto", erro);
    return Response.json({ erro: "Não consegui guardar a foto." }, { status: 500 });
  }
}
