// O endereço que o relógio (pg_cron do Supabase do Nikola's) chama a cada
// 2 minutos para vigiar o delivery e mandar as notificações. Só responde a
// quem manda o segredo CRON_SECRET no cabeçalho x-cron-secret.

import { createHash, timingSafeEqual } from "node:crypto";
import { vigiarDelivery } from "@/lib/notificacoes/delivery";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  const enviado = req.headers.get("x-cron-secret") ?? "";
  if (!segredo || !enviado) return false;
  const a = createHash("sha256").update(segredo).digest();
  const b = createHash("sha256").update(enviado).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!autorizado(req)) return Response.json({ erro: "não autorizado" }, { status: 401 });
  try {
    return Response.json(await vigiarDelivery());
  } catch (erro) {
    console.error("notificacoes: vigilância do delivery falhou", erro);
    return Response.json({ erro: "falhou" }, { status: 500 });
  }
}
