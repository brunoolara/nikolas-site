// O PDF do comprovante de um pagamento, só da pessoa do login (?id=).
// Quem é a pessoa vem da sessão, nunca do endereço.

import { exigir } from "@/lib/acessos/sessao";
import { lerComprovante, nomeArquivo, pdfComprovante } from "@/lib/caixinha/comprovante";
import { PAGAMENTO_ID } from "@/lib/caixinha/tipos";

export async function GET(req: Request) {
  const { sessao, liberado } = await exigir("minha-caixinha");
  if (!liberado || !sessao.pessoa) return new Response("Sem acesso.", { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const c = PAGAMENTO_ID.test(id) ? await lerComprovante(id, sessao.pessoa) : null;
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
