// Quem entra no rateio da caixinha. Sócios não entram. Quem saiu da casa é
// desativado, não apagado, para os dias antigos continuarem com o nome.

import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { lerEquipe, lerEstado } from "@/lib/caixinha/armazem";
import { reais } from "@/lib/caixinha/tipos";
import Equipe from "./Equipe";

export default async function PaginaEquipe() {
  if (!(await exigir("caixinha")).liberado) return null;
  const [equipe, estado] = await Promise.all([lerEquipe(), lerEstado()]);
  const pessoas = equipe
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p) => ({ id: p.id, nome: p.nome, ativo: p.ativo, saldo: estado.saldos[p.id] ?? 0 }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Cabecalho
        voltar={{ href: "/caixinha", rotulo: "Caixinha" }}
        titulo="Equipe da caixinha"
        descricao="Todos os funcionários entram no rateio; sócios ficam de fora. Quem tem saldo negativo aparece com o valor que ainda deve."
      />
      <Equipe pessoas={pessoas.map((p) => ({ ...p, saldoTexto: p.saldo < 0 ? reais(-p.saldo) : "" }))} />
    </div>
  );
}
