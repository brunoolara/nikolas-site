"use client";

// O funcionário troca a própria senha: a atual, a nova (6 números) e a nova de novo.

import { useState, useTransition } from "react";
import { acaoMinhaSenha } from "./acoes";

const soNumeros = (v: string) => v.replace(/\D/g, "").slice(0, 6);

function Campo({ rotulo, valor, mudar, auto }: { rotulo: string; valor: string; mudar: (v: string) => void; auto: string }) {
  return (
    <label className="block text-sm font-semibold">
      {rotulo}
      <input
        type="password"
        inputMode="numeric"
        autoComplete={auto}
        maxLength={6}
        value={valor}
        onChange={(e) => mudar(soNumeros(e.target.value))}
        className="p-campo mt-1 tabular-nums tracking-[0.3em]"
      />
    </label>
  );
}

export default function MinhaSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetida, setRepetida] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const pronta = atual.length > 0 && nova.length === 6 && repetida.length === 6;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nova !== repetida) return setAviso({ ok: false, mensagem: "A senha nova e a repetida não são iguais." });
    iniciar(async () => {
      const r = await acaoMinhaSenha(atual, nova);
      setAviso(r);
      if (r.ok) {
        setAtual("");
        setNova("");
        setRepetida("");
      }
    });
  }

  return (
    <section className="p-cartao mt-4 p-5">
      <h2 className="p-cartao-titulo">Trocar minha senha</h2>
      <p className="mt-1 text-sm text-cafe">A senha nova tem 6 números, só números.</p>
      <form onSubmit={salvar} className="mt-4 grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Senha atual" valor={atual} mudar={setAtual} auto="current-password" />
        <Campo rotulo="Senha nova" valor={nova} mudar={setNova} auto="new-password" />
        <Campo rotulo="Repita a senha nova" valor={repetida} mudar={setRepetida} auto="new-password" />
        <div className="sm:col-span-3">
          <button type="submit" disabled={!pronta || ocupado} className="p-btn p-btn-primario min-h-11 px-6">
            {ocupado ? "Trocando…" : "Trocar senha"}
          </button>
        </div>
      </form>
      {aviso ? <p className={`p-aviso mt-4 ${aviso.ok ? "p-aviso-ok" : "p-aviso-erro"}`}>{aviso.mensagem}</p> : null}
    </section>
  );
}
