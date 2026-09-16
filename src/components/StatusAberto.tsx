"use client";

import { useEffect, useState } from "react";
import { statusAgora, type Status } from "@/lib/horarios";

// Calculado só no cliente: a página é estática e o horário depende do relógio de quem abre.
export default function StatusAberto({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const atualizar = () => setStatus(statusAgora());
    atualizar();
    const id = setInterval(atualizar, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return <p className={`min-h-6 ${className}`} aria-hidden="true" />;

  return (
    <p className={`flex items-center gap-2 text-[15px] ${className}`} aria-live="polite">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${status.aberto ? "bg-chope" : "bg-cafe/50"}`}
        aria-hidden="true"
      />
      {status.aberto ? (
        <span>
          <strong className="font-semibold">Aberto agora</strong>, fecha às {status.fechaAs}
        </span>
      ) : (
        <span>
          <strong className="font-semibold">Fechado agora</strong>
          {status.abreAs && `, abre ${status.hoje ? "hoje" : ""} às ${status.abreAs}`}
        </span>
      )}
    </p>
  );
}
