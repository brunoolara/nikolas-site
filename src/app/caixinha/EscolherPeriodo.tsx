// Escolha de período por data de início e de fim, com atalhos. Formulário
// comum (GET): o período fica no endereço, e o voltar do navegador funciona.

import Link from "next/link";

type Atalho = { rotulo: string; ini: string; fim: string };

type Props = { acao: string; ini: string; fim: string; max: string; atalhos: Atalho[] };

export default function EscolherPeriodo({ acao, ini, fim, max, atalhos }: Props) {
  return (
    <section className="p-cartao mt-4 p-4">
      <form action={acao} className="flex flex-wrap items-end gap-3">
        <label className="min-w-36 flex-1">
          <span className="p-rotulo">Início</span>
          <input type="date" name="ini" defaultValue={ini} max={max} required className="p-campo mt-1" />
        </label>
        <label className="min-w-36 flex-1">
          <span className="p-rotulo">Fim</span>
          <input type="date" name="fim" defaultValue={fim} max={max} required className="p-campo mt-1" />
        </label>
        <button type="submit" className="p-btn p-btn-primario min-h-11 px-5">
          Ver período
        </button>
      </form>
      {atalhos.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {atalhos.map((a) => {
            const ativo = a.ini === ini && a.fim === fim;
            return (
              <Link
                key={a.rotulo}
                href={`${acao}?ini=${a.ini}&fim=${a.fim}`}
                aria-current={ativo ? "true" : undefined}
                className={`p-btn p-btn-sm ${ativo ? "p-btn-primario" : "p-btn-secundario"}`}
              >
                {a.rotulo}
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
