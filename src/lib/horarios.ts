import { turnosDoDia } from "@/data/restaurante";

const FUSO = "America/Sao_Paulo";

function paraMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function agoraEmOuroFino(data: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const pegar = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    dia: dias.indexOf(pegar("weekday")),
    minutos: (Number(pegar("hour")) % 24) * 60 + Number(pegar("minute")),
  };
}

function formatarHora(hhmm: string) {
  const [h, m] = hhmm.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export type Status =
  | { aberto: true; fechaAs: string }
  | { aberto: false; abreAs: string; hoje: boolean };

/** Diz se o restaurante está aberto agora e qual o próximo horário relevante. */
export function statusAgora(data = new Date()): Status {
  const { dia, minutos } = agoraEmOuroFino(data);

  for (const [abre, fecha] of turnosDoDia(dia)) {
    if (minutos >= paraMinutos(abre) && minutos < paraMinutos(fecha)) {
      return { aberto: true, fechaAs: formatarHora(fecha) };
    }
  }

  const proximoHoje = turnosDoDia(dia).find(([abre]) => minutos < paraMinutos(abre));
  if (proximoHoje) return { aberto: false, abreAs: formatarHora(proximoHoje[0]), hoje: true };

  for (let i = 1; i <= 7; i++) {
    const turnos = turnosDoDia((dia + i) % 7);
    if (turnos.length) return { aberto: false, abreAs: formatarHora(turnos[0][0]), hoje: false };
  }
  return { aberto: false, abreAs: "", hoje: false };
}

export function formatarTurnos(turnos: readonly (readonly [string, string])[]) {
  return turnos.map(([a, f]) => `${formatarHora(a)} às ${formatarHora(f)}`).join(" e ");
}
