"use client";

// Liga as notificações neste aparelho e escolhe quais avisos receber.
// No iPhone o push só funciona com o painel adicionado à tela de início e
// aberto pelo ícone; a tela explica o passo quando for o caso.

import { useEffect, useState, useTransition } from "react";
import { acaoDesinscrever, acaoInscrever, acaoPreferencia, acaoTestar } from "./acoes";

type Tipo = { chave: "deliveryNovo" | "deliveryAtrasado"; nome: string; descricao: string };

type Props = {
  chavePublica: string;
  configurado: boolean;
  podeDelivery: boolean;
  tipos: Tipo[];
  preferencias: Record<Tipo["chave"], boolean>;
};

type Situacao = "carregando" | "sem-suporte" | "iphone-instalar" | "negado" | "desligado" | "ligado";

function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

function nomeDoAparelho(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Computador (Windows)";
  if (/Mac/.test(ua)) return "Mac";
  return "Aparelho";
}

const ehIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const instalado = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function Notificacoes({ chavePublica, configurado, podeDelivery, tipos, preferencias }: Props) {
  const [situacao, setSituacao] = useState<Situacao>("carregando");
  const [endpoint, setEndpoint] = useState("");
  const [aviso, setAviso] = useState("");
  const [prefs, setPrefs] = useState(preferencias);
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    (async () => {
      const temPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!temPush) return setSituacao(ehIOS() && !instalado() ? "iphone-instalar" : "sem-suporte");
      if (Notification.permission === "denied") return setSituacao("negado");
      const registro = await navigator.serviceWorker.getRegistration("/");
      const assinatura = await registro?.pushManager.getSubscription();
      if (assinatura) {
        setEndpoint(assinatura.endpoint);
        // o aparelho acha que está inscrito, mas o servidor pode ter perdido a
        // inscrição (foi o que aconteceu na troca do Blob pelo Supabase, 12/11):
        // reenvia a cada visita, sem mexer nas preferências
        const json = assinatura.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        void acaoInscrever(json, nomeDoAparelho()).catch(() => {});
      }
      setSituacao(assinatura ? "ligado" : "desligado");
    })().catch(() => setSituacao("sem-suporte"));
  }, []);

  function ativar() {
    iniciar(async () => {
      try {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") {
          setSituacao(permissao === "denied" ? "negado" : "desligado");
          return;
        }
        const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const assinatura =
          (await registro.pushManager.getSubscription()) ??
          (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(chavePublica) }));
        const json = assinatura.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const r = await acaoInscrever(json, nomeDoAparelho());
        setAviso(r.mensagem);
        if (r.ok) {
          setEndpoint(assinatura.endpoint);
          setSituacao("ligado");
        }
      } catch {
        setAviso("Não consegui ativar neste aparelho. Tente de novo.");
      }
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
      ) : !podeDelivery ? (
        <p className="p-aviso p-aviso-info mt-4">
          Por enquanto os avisos são do delivery, e seu acesso não inclui o Ao vivo.
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
