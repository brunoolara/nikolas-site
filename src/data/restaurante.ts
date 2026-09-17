// Dados cadastrais do Nikola's. Fonte: site atual (Google Sites), perfil no
// Google e Instagram, levantados em 2026-09-16. Tudo que aparece no site sai daqui.

export const restaurante = {
  nome: "Nikola's Restaurante",
  nomeCurto: "Nikola's",
  slogan: "Tradição & Qualidade desde 1977",
  fundacao: 1977,
  siteUrl: "https://www.nikolasrestaurante.com.br",
  email: "contato@nikolasrestaurante.com.br",
  telefoneExibicao: "(35) 9 9772-8359",
  telefoneE164: "+5535997728359",
  whatsapp: {
    reserva:
      "https://wa.me/5535997728359?text=" +
      encodeURIComponent("Olá! Gostaria de fazer uma reserva no Nikola's."),
    pedido:
      "https://wa.me/5535997728359?text=" +
      encodeURIComponent("Olá, gostaria de fazer um pedido."),
    contato: "https://wa.me/5535997728359",
  },
  delivery: {
    url: "https://nikolas.qrpedir.com/",
    nome: "cardápio digital",
  },
  instagram: {
    url: "https://www.instagram.com/restaurante_nikolas/",
    handle: "@restaurante_nikolas",
  },
  endereco: {
    rua: "R. Américo Rossi, S/N",
    complemento: "Sala 9",
    bairro: "Centro",
    cidade: "Ouro Fino",
    uf: "MG",
    cep: "37570-000",
    linha: "R. Américo Rossi, S/N, Sala 9, Centro, Ouro Fino - MG",
  },
  geo: { lat: -22.280545, lng: -46.369694 },
  mapas: {
    embed:
      "https://maps.google.com/maps?q=-22.280545,-46.369694&z=17&hl=pt-BR&output=embed",
    rota: "https://www.google.com/maps/dir/?api=1&destination=Nikola%27s+Restaurante+Ouro+Fino",
    waze: "https://www.waze.com/ul?q=Rua+Am%C3%A9rico+Rossi+S%2FN+Centro+Ouro+Fino+MG&navigate=yes",
    perfilGoogle: "https://share.google/0cBP7IYkMEQSbdyWG",
  },
  google: {
    nota: "4,4",
    avaliacoes: "1.182",
  },
  // Horários por dia da semana (0 = domingo). Cada turno é [abre, fecha] em "HH:MM".
  horarios: [
    { dias: [1, 2, 3, 4, 5], rotulo: "Segunda a sexta", turnos: [["11:00", "14:00"], ["19:00", "22:00"]] },
    { dias: [6], rotulo: "Sábado", turnos: [["11:00", "14:30"], ["19:00", "22:00"]] },
    { dias: [0], rotulo: "Domingo", turnos: [["11:00", "14:30"]] },
  ] as const,
} as const;

export type Turno = readonly [string, string];

export function turnosDoDia(diaSemana: number): readonly Turno[] {
  const faixa = restaurante.horarios.find((h) => (h.dias as readonly number[]).includes(diaSemana));
  return faixa ? faixa.turnos : [];
}

export const anosDeTradicao = new Date().getFullYear() - restaurante.fundacao;
