"use client";

// Mês e ano da agenda. Trocar leva ao dia 1 do mês escolhido (ou a hoje, se
// for o mês corrente). Também rola a faixa de dias até o dia aberto, que pode
// estar no fim do mês, fora da tela do celular.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Props = { pedido: string; hoje: string; anos: number[] };

export default function SeletorMes({ pedido, hoje, anos }: Props) {
  const router = useRouter();
  const [ano, mes] = pedido.split("-").map(Number);

  useEffect(() => {
    document
      .querySelector('[aria-label="Dias do mês"] [aria-current="date"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pedido]);

  function ir(novoAno: number, novoMes: number) {
    const inicio = `${novoAno}-${String(novoMes).padStart(2, "0")}-01`;
    const destino = hoje.startsWith(inicio.slice(0, 7)) ? hoje : inicio;
    router.push(destino === hoje ? "/posts" : `/posts?dia=${destino}`);
  }

  const campo = "rounded border border-linha bg-white px-2 py-1.5 text-sm";
  return (
    <div className="mt-4 flex justify-center gap-2">
      <select aria-label="Mês" value={mes} onChange={(e) => ir(ano, Number(e.target.value))} className={campo}>
        {MESES.map((nome, i) => (
          <option key={nome} value={i + 1}>
            {nome}
          </option>
        ))}
      </select>
      <select aria-label="Ano" value={ano} onChange={(e) => ir(Number(e.target.value), mes)} className={campo}>
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
