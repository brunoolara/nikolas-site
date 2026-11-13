// Espera ao trocar de área do painel (o layout de cada área é refeito). Nas
// páginas do site público não aparece nada: elas já vêm prontas.

import "@/components/painel/painel.css";
import { TelaCarregando } from "@/components/painel/Carregando";

export default function Carregando() {
  return <TelaCarregando />;
}
