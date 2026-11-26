// O lado do aparelho das notificações: ver se este navegador já está inscrito
// e inscrever. Usado pelo Perfil e pelo aviso que pede para ativar.

import { acaoInscrever } from "@/app/perfil/acoes";

export type Situacao = "carregando" | "sem-suporte" | "iphone-instalar" | "negado" | "desligado" | "ligado";

type Json = { endpoint: string; keys: { p256dh: string; auth: string } };

function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

export function nomeDoAparelho(): string {
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

/** Como este aparelho está, e a inscrição que ele tem (se tiver). */
export async function situacaoDoAparelho(): Promise<{ situacao: Situacao; assinatura: PushSubscription | null }> {
  const temPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!temPush) return { situacao: ehIOS() && !instalado() ? "iphone-instalar" : "sem-suporte", assinatura: null };
  if (Notification.permission === "denied") return { situacao: "negado", assinatura: null };
  const registro = await navigator.serviceWorker.getRegistration("/");
  const assinatura = (await registro?.pushManager.getSubscription()) ?? null;
  return { situacao: assinatura ? "ligado" : "desligado", assinatura };
}

/** Reenvia ao servidor a inscrição que o aparelho já tem (o servidor pode tê-la perdido). */
export function reenviar(assinatura: PushSubscription) {
  void acaoInscrever(assinatura.toJSON() as Json, nomeDoAparelho()).catch(() => {});
}

/** Pede a permissão e inscreve este aparelho. */
export async function ativarNesteAparelho(
  chavePublica: string,
): Promise<{ situacao: Situacao; mensagem: string; endpoint?: string }> {
  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return { situacao: permissao === "denied" ? "negado" : "desligado", mensagem: "" };
    const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const assinatura =
      (await registro.pushManager.getSubscription()) ??
      (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(chavePublica) }));
    const r = await acaoInscrever(assinatura.toJSON() as Json, nomeDoAparelho());
    return r.ok
      ? { situacao: "ligado", mensagem: r.mensagem, endpoint: assinatura.endpoint }
      : { situacao: "desligado", mensagem: r.mensagem };
  } catch {
    return { situacao: "desligado", mensagem: "Não consegui ativar neste aparelho. Tente de novo." };
  }
}
