"use client";

// Redesenha a tela a cada minuto (a leitura da Takeat é compartilhada e só
// renova a cada 2 min no servidor, então abrir em vários celulares não gasta
// cota a mais) e mostra há quanto tempo veio a última leitura.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AutoAtualizar({ lidoEm }: { lidoEm: string }) {
  const router = useRouter();
  const [agora, setAgora] = useState(() => Date.now());
  const [atualizando, iniciar] = useTransition();

  useEffect(() => {
    const tique = setInterval(() => setAgora(Date.now()), 15_000);
    const refazer = setInterval(() => iniciar(() => router.refresh()), 60_000);
    const aoVoltar = () => document.visibilityState === "visible" && iniciar(() => router.refresh());
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(tique);
      clearInterval(refazer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [router]);

  const idade = Math.max(0, Math.round((agora - new Date(lidoEm).getTime()) / 60_000));

  return (
    <div className="flex items-center gap-2 text-sm text-cafe">
      <span className={`inline-block h-2 w-2 rounded-full ${idade <= 3 ? "bg-verde" : "bg-chope"}`} aria-hidden />
      <span>{idade === 0 ? "Atualizado agora" : `Atualizado há ${idade} min`}</span>
      <button
        type="button"
        disabled={atualizando}
        onClick={() => iniciar(() => router.refresh())}
        className="p-btn p-btn-secundario p-btn-sm"
      >
        {atualizando ? "Atualizando…" : "Atualizar"}
      </button>
    </div>
  );
}
