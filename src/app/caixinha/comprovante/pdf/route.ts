// O PDF do comprovante de uma pessoa (?id=&pessoa= de um pagamento feito, ou
// ?ini=&fim=&pessoa= para a prévia de dias ainda abertos).

import { pode } from "@/lib/acessos/sessao";
import { buscarComprovante, fonteDe, nomeArquivo, pdfComprovante } from "@/lib/caixinha/comprovante";

export async function GET(req: Request) {
  if (!(await pode("caixinha"))) return new Response("Entre com usuário e senha.", { status: 401 });
  const busca = new URL(req.url).searchParams;
  const fonte = fonteDe(busca);
  const pessoa = busca.get("pessoa") ?? "";
  const c = fonte && pessoa ? await buscarComprovante(fonte, pessoa) : null;
  if (!c) return new Response("Comprovante não encontrado.", { status: 404 });

  const pdf = await pdfComprovante(c);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo(c)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
