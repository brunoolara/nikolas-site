// Recebe o e-mail "Conferência de caixa" da Takeat, mandado pelo programa do
// Google (Apps Script) que roda na conta nikolas@ a cada 5 minutos — o código
// dele está em scripts/apps-script-caixa.gs. Só responde a quem manda o
// segredo CAIXA_SECRET no cabeçalho x-caixa-secret.
//
// Lê o e-mail (lib/caixa/email.ts), guarda e avisa os gestores no celular. O
// mesmo e-mail mandado de novo não repete nada. E-mail que não deu para ler
// fica guardado com o motivo e aparece na tela; a resposta é 200 mesmo assim,
// para o programa não ficar mandando o mesmo e-mail para sempre.

import { createHash, timingSafeEqual } from "node:crypto";
import { lerFechamento } from "@/lib/caixa/email";
import { guardar } from "@/lib/caixa/armazem";
import { avisarCaixa } from "@/lib/notificacoes/caixa";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const segredo = process.env.CAIXA_SECRET;
  const enviado = req.headers.get("x-caixa-secret") ?? "";
  if (!segredo || !enviado) return false;
  const a = createHash("sha256").update(segredo).digest();
  const b = createHash("sha256").update(enviado).digest();
  return timingSafeEqual(a, b);
}

/** Agora em Ouro Fino, AAAA-MM-DDTHH:MM. */
const agoraLocal = () =>
  new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(" ", "T");

/** Avisa só fechamento das últimas 12 horas: os antigos (a primeira leva do programa) entram calados. */
function recente(fechado: string): boolean {
  const agora = new Date(`${agoraLocal()}:00Z`).getTime();
  return agora - new Date(`${fechado}:00Z`).getTime() < 12 * 3600 * 1000;
}

export async function POST(req: Request) {
  if (!autorizado(req)) return Response.json({ erro: "não autorizado" }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { id?: unknown; assunto?: unknown; html?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id.slice(0, 100) : "";
  const html = typeof corpo?.html === "string" ? corpo.html : "";
  const assunto = typeof corpo?.assunto === "string" ? corpo.assunto.slice(0, 200) : "";
  if (!id || !html || html.length > 500_000) return Response.json({ erro: "faltou o e-mail" }, { status: 400 });

  try {
    const r = lerFechamento(id, html);
    if (!r.ok) {
      console.error("caixa: e-mail ilegível", id, r.erro);
      const agora = agoraLocal();
      await guardar(agora.slice(0, 7), { id, ilegivel: true, assunto, erro: r.erro, recebido: agora });
      return Response.json({ ok: false, erro: r.erro });
    }
    const f = r.fechamento;
    const novo = await guardar(f.fechado.slice(0, 7), f);
    const avisados = novo && recente(f.fechado) ? await avisarCaixa(f) : 0;
    return Response.json({ ok: true, novo, avisados });
  } catch (erro) {
    console.error("caixa: falha ao guardar o fechamento", erro);
    return Response.json({ erro: "falhou" }, { status: 500 });
  }
}
