// O PDF do comprovante de uma pessoa num pagamento (?id=&pessoa=).

import { pode } from "@/lib/acessos/sessao";
import { lerComprovante, nomeArquivo, pdfComprovante } from "@/lib/caixinha/comprovante";
import { PAGAMENTO_ID } from "@/lib/caixinha/tipos";

export async function GET(req: Request) {
  if (!(await pode("caixinha"))) return new Response("Entre com usuário e senha.", { status: 401 });
  const busca = new URL(req.url).searchParams;
  const id = busca.get("id") ?? "";
  const pessoa = busca.get("pessoa") ?? "";
  const c = PAGAMENTO_ID.test(id) && pessoa ? await lerComprovante(id, pessoa) : null;
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
