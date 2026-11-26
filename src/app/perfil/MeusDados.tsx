"use client";

// Nome (só mostra), CPF e celular, que a própria pessoa preenche. Os dois são opcionais.

import { useState, useTransition } from "react";
import { mostrarCelular, mostrarCpf, soDigitos } from "@/lib/acessos/dados";
import { acaoMeusDados } from "./acoes";

// vai formatando enquanto digita: 123.456.789-01 e (35) 99999-9999
function digitandoCpf(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return d.length === 11 ? mostrarCpf(d) : d;
}
function digitandoCelular(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return d.length >= 10 ? mostrarCelular(d) : d;
}

type Props = { nome: string; cpf: string; celular: string };

export default function MeusDados({ nome, cpf, celular }: Props) {
  const [c, setC] = useState(cpf ? mostrarCpf(cpf) : "");
  const [cel, setCel] = useState(celular ? mostrarCelular(celular) : "");
  const [aviso, setAviso] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [ocupado, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => setAviso(await acaoMeusDados(c, cel)));
  }

  return (
    <section className="p-cartao mt-4 p-5">
      <h2 className="p-cartao-titulo">Meus dados</h2>
      <p className="mt-1 text-sm text-cafe">Só a gerência vê. CPF e celular não são obrigatórios.</p>
      <form onSubmit={salvar} className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold">
          Nome
          <input value={nome} readOnly disabled className="p-campo mt-1" />
        </label>
        <label className="block text-sm font-semibold">
          CPF
          <input
            value={c}
            onChange={(e) => setC(digitandoCpf(e.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            className="p-campo mt-1 tabular-nums"
          />
        </label>
        <label className="block text-sm font-semibold">
          Celular
          <input
            value={cel}
            onChange={(e) => setCel(digitandoCelular(e.target.value))}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(35) 99999-9999"
            className="p-campo mt-1 tabular-nums"
          />
        </label>
        <div className="sm:col-span-3">
          <button type="submit" disabled={ocupado} className="p-btn p-btn-primario min-h-11 px-6">
            {ocupado ? "Salvando…" : "Salvar dados"}
          </button>
        </div>
      </form>
      {aviso ? <p className={`p-aviso mt-4 ${aviso.ok ? "p-aviso-ok" : "p-aviso-erro"}`}>{aviso.mensagem}</p> : null}
    </section>
  );
}
