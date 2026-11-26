"use client";

// Liga as notificações neste aparelho e escolhe quais avisos receber.
// No iPhone o push só funciona com o painel adicionado à tela de início e
// aberto pelo ícone; a tela explica o passo quando for o caso.

import { useEffect, useState, useTransition } from "react";
import type { TipoAviso } from "@/lib/notificacoes/armazem";
import { ativarNesteAparelho, reenviar, situacaoDoAparelho, type Situacao } from "@/lib/notificacoes/aparelho";
import { acaoDesinscrever, acaoPreferencia, acaoTestar } from "./acoes";

type Tipo = { chave: TipoAviso; nome: string; descricao: string };

type Props = {
  chavePublica: string;
  configurado: boolean;
  /** Só os avisos que fazem sentido para a pessoa (tiposDe). */
  tipos: Tipo[];
  preferencias: Record<TipoAviso, boolean>;
};

export default function Notificacoes({ chavePublica, configurado, tipos, preferencias }: Props) {
  const [situacao, setSituacao] = useState<Situacao>("carregando");
  const [endpoint, setEndpoint] = useState("");
  const [aviso, setAviso] = useState("");
  const [prefs, setPrefs] = useState(preferencias);
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    situacaoDoAparelho()
      .then(({ situacao, assinatura }) => {
        if (assinatura) {
          setEndpoint(assinatura.endpoint);
          // o aparelho acha que está inscrito, mas o servidor pode ter perdido a
          // inscrição (foi o que aconteceu na troca do Blob pelo Supabase, 12/11):
          // reenvia a cada visita, sem mexer nas preferências
          reenviar(assinatura);
        }
        setSituacao(situacao);
      })
      .catch(() => setSituacao("sem-suporte"));
  }, []);

  function ativar() {
    iniciar(async () => {
      const r = await ativarNesteAparelho(chavePublica);
      setAviso(r.mensagem);
      setSituacao(r.situacao);
      if (r.endpoint) setEndpoint(r.endpoint);
    });
  }

  function desativar() {
    iniciar(async () => {
      const registro = await navigator.serviceWorker.getRegistration("/");
      const assinatura = await registro?.pushManager.getSubscription();
      await assinatura?.unsubscribe();
      setAviso((await acaoDesinscrever(endpoint || assinatura?.endpoint || "")).mensagem);
      setEndpoint("");
      setSituacao("desligado");
    });
  }

  function mudar(chave: Tipo["chave"], ligado: boolean) {
    setPrefs((p) => ({ ...p, [chave]: ligado }));
    iniciar(async () => {
      const r = await acaoPreferencia(chave, ligado);
      if (!r.ok) {
        setPrefs((p) => ({ ...p, [chave]: !ligado }));
        setAviso(r.mensagem);
      }
    });
  }

  return (
    <section className="p-cartao mt-4 p-5">
      <h2 className="p-cartao-titulo">Notificações no celular</h2>
      <p className="mt-1 text-sm text-cafe">Avisos que chegam mesmo com o painel fechado.</p>

      {!configurado ? (
        <p className="p-aviso p-aviso-alerta mt-4">As notificações ainda não foram configuradas na Vercel.</p>
      ) : !tipos.length ? (
        <p className="p-aviso p-aviso-info mt-4">
          Ainda não há avisos para o seu acesso. Os da Caixinha chegam quando o seu login está ligado a alguém da
          equipe; fale com o Bruno.
        </p>
      ) : situacao === "carregando" ? (
        <p className="mt-4 text-sm text-cafe">Conferindo este aparelho…</p>
      ) : situacao === "iphone-instalar" ? (
        <div className="p-aviso p-aviso-info mt-4">
          <p className="font-semibold">No iPhone, primeiro adicione o painel à tela de início:</p>
          <ol className="mt-1 list-decimal pl-5">
            <li>toque em Compartilhar (o quadrado com a seta) no Safari;</li>
            <li>escolha &quot;Adicionar à Tela de Início&quot;;</li>
            <li>abra o painel pelo ícone novo e volte aqui em Perfil.</li>
          </ol>
        </div>
      ) : situacao === "sem-suporte" ? (
        <p className="p-aviso p-aviso-info mt-4">Este navegador não recebe notificações. No celular, use o Chrome ou o Safari.</p>
      ) : situacao === "negado" ? (
        <p className="p-aviso p-aviso-alerta mt-4">
          As notificações do painel estão bloqueadas neste aparelho. Libere nos ajustes do navegador (ou do iPhone, em
          Ajustes › Notificações) e volte aqui.
        </p>
      ) : situacao === "desligado" ? (
        <button type="button" disabled={ocupado} onClick={ativar} className="p-btn p-btn-primario mt-4 min-h-11 w-full sm:w-auto">
          Ativar notificações neste aparelho
        </button>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-linha/70 border-y border-linha/70">
            {tipos.map((t) => (
              <li key={t.chave}>
                <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2">
                  <span>
                    <span className="block font-semibold">{t.nome}</span>
                    <span className="block text-sm text-cafe">{t.descricao}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={prefs[t.chave]}
                    onChange={(e) => mudar(t.chave, e.target.checked)}
                    className="p-chave"
                  />
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => iniciar(async () => setAviso((await acaoTestar()).mensagem))}
              className="p-btn p-btn-secundario"
            >
              Enviar um teste
            </button>
            <button type="button" disabled={ocupado} onClick={desativar} className="p-btn p-btn-fantasma">
              Desativar neste aparelho
            </button>
          </div>
        </>
      )}
      {aviso ? <p className="mt-3 text-sm text-cafe" role="status">{aviso}</p> : null}
    </section>
  );
}
