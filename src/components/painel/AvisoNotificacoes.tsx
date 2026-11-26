"use client";

// Ao abrir o painel, pede ao funcionário para ligar as notificações neste
// aparelho. Some de vez quando ele ativa (o aparelho fica inscrito). Se ele
// fechar sem ativar, volta no dia seguinte. Não aparece quando o aparelho não
// recebe notificações ou quando elas estão bloqueadas nos ajustes.

import { useEffect, useRef, useState, useTransition } from "react";
import { ativarNesteAparelho, situacaoDoAparelho, type Situacao } from "@/lib/notificacoes/aparelho";

const CHAVE = "nikolas:aviso-notificacoes-fechado";
const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export default function AvisoNotificacoes({ chavePublica }: { chavePublica: string }) {
  const janela = useRef<HTMLDialogElement>(null);
  const [situacao, setSituacao] = useState<Situacao>("carregando");
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE) === hoje()) return;
    } catch {}
    situacaoDoAparelho()
      .then(({ situacao }) => {
        setSituacao(situacao);
        if (situacao === "desligado" || situacao === "iphone-instalar") janela.current?.showModal();
      })
      .catch(() => {});
  }, []);

  function fechar() {
    try {
      localStorage.setItem(CHAVE, hoje());
    } catch {}
    janela.current?.close();
  }

  function ativar() {
    iniciar(async () => {
      const r = await ativarNesteAparelho(chavePublica);
      if (r.situacao === "ligado") return janela.current?.close();
      if (r.situacao === "negado") {
        setErro("As notificações foram bloqueadas. Para ligar depois, libere nos ajustes do celular e vá em Perfil.");
        return;
      }
      setErro(r.mensagem || "Não ativou. Tente de novo ou feche e ative depois em Perfil.");
    });
  }

  return (
    <dialog
      ref={janela}
      className="p-folha"
      aria-label="Ativar notificações"
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) fechar();
      }}
    >
      <div className="p-folha-corpo space-y-4">
        <div className="mx-auto h-1 w-10 rounded-full bg-linha" aria-hidden="true" />
        <div>
          <h2 className="font-display text-xl">Ative as notificações</h2>
          <p className="mt-1 text-sm text-cafe">
            Assim os avisos do painel chegam no seu celular, mesmo com ele fechado.
          </p>
        </div>

        {situacao === "iphone-instalar" ? (
          <div className="p-aviso p-aviso-info">
            <p className="font-semibold">No iPhone, primeiro adicione o painel à tela de início:</p>
            <ol className="mt-1 list-decimal pl-5">
              <li>toque em Compartilhar (o quadrado com a seta) no Safari;</li>
              <li>escolha &quot;Adicionar à Tela de Início&quot;;</li>
              <li>abra o painel pelo ícone novo e toque em Ativar.</li>
            </ol>
          </div>
        ) : null}

        {erro ? <p className="p-aviso p-aviso-erro">{erro}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          {situacao === "desligado" ? (
            <button type="button" disabled={ocupado} onClick={ativar} className="p-btn p-btn-primario min-h-11 flex-1">
              {ocupado ? "Ativando…" : "Ativar"}
            </button>
          ) : null}
          <button type="button" disabled={ocupado} onClick={fechar} className="p-btn p-btn-fantasma min-h-11 flex-1">
            {situacao === "desligado" ? "Agora não" : "Entendi"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
