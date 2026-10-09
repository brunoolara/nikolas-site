// As folhas de impressão mostram preço: só para quem pode alterar o cardápio.

import { redirect } from "next/navigation";
import { pode } from "@/lib/acessos/sessao";

export const dynamic = "force-dynamic";

export default async function LayoutImprimir({ children }: { children: React.ReactNode }) {
  if (!(await pode("cardapio"))) redirect("/");
  return children;
}
