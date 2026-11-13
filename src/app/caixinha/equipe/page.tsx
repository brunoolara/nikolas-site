// Quem entra no rateio da caixinha. Sócios não entram. Quem saiu da casa é
// desativado, não apagado, para os dias antigos continuarem com o nome.

import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { lerEquipe, lerEstado } from "@/lib/caixinha/armazem";
import { reais } from "@/lib/caixinha/tipos";
import Equipe from "./Equipe";
import Abas from "../Abas";

export default async function PaginaEquipe() {
  const { sessao, liberado } = await exigir("caixinha");
  if (!liberado) return null;
  const [equipe, estado] = await Promise.all([lerEquipe(), lerEstado()]);
  const pessoas = equipe
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      ativo: p.ativo,
      parte: p.parte ?? 100,
      parteDomingo: p.parteDomingo ?? null,
      saldo: estado.saldos[p.id] ?? 0,
    }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Equipe da caixinha"
        descricao="Todos os funcionários entram no rateio; sócios ficam de fora. A parte é o % com que a pessoa entra no turno ao ser marcada (dá para mudar no dia). Quem tem saldo negativo aparece com o valor que ainda deve."
      />
      <Abas atual="equipe" master={sessao.master} />
      <Equipe pessoas={pessoas.map((p) => ({ ...p, saldoTexto: p.saldo < 0 ? reais(-p.saldo) : "" }))} />
    </div>
  );
}
