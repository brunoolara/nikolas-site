// Escolha de período: primeiro os atalhos (pílulas, um só marcado), depois as
// datas de início e fim com o "Ver período". Formulário comum (GET): o
// período fica no endereço, e o voltar do navegador funciona.
// Usado em Pagar período e no Relatório (redesenho de 26/11/2026: o botão de
// enviar não se mistura mais com os atalhos).

import Link from "next/link";

type Atalho = { rotulo: string; ini: string; fim: string };

type Props = { acao: string; ini: string; fim: string; max: string; atalhos: Atalho[] };

export default function EscolherPeriodo({ acao, ini, fim, max, atalhos }: Props) {
  // dois atalhos podem dar o mesmo período (ex.: "Esta semana" e "Desde o último pagamento"): marca só o primeiro
  const ativo = atalhos.find((a) => a.ini === ini && a.fim === fim)?.rotulo;
  return (
    <section className="p-cartao mt-4 p-4">
      {atalhos.length ? (
        <>
          <p className="p-rotulo">Atalhos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {atalhos.map((a) => (
              <Link
                key={a.rotulo}
                href={`${acao}?ini=${a.ini}&fim=${a.fim}`}
                aria-current={a.rotulo === ativo ? "true" : undefined}
                className="p-chip"
              >
                {a.rotulo}
              </Link>
            ))}
          </div>
          <div className="my-4 flex items-center gap-3 text-xs text-cafe" aria-hidden="true">
            <span className="h-px flex-1 bg-linha" />
            ou escolha as datas
            <span className="h-px flex-1 bg-linha" />
          </div>
        </>
      ) : null}
      <form action={acao} className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block min-w-0">
          <span className="p-rotulo">Início</span>
          <input type="date" name="ini" defaultValue={ini} max={max} required className="p-campo mt-1 h-11" />
        </label>
        <label className="block min-w-0">
          <span className="p-rotulo">Fim</span>
          <input type="date" name="fim" defaultValue={fim} max={max} required className="p-campo mt-1 h-11" />
        </label>
        <button type="submit" className="p-btn p-btn-secundario col-span-2 h-11 px-6 sm:col-span-1">
          Ver período
        </button>
      </form>
    </section>
  );
}
