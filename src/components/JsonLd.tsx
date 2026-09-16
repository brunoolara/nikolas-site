import { restaurante } from "@/data/restaurante";

const diasSchema = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Dados estruturados do restaurante (schema.org/Restaurant) para o Google entender
// endereço, horários e telefone sem depender do texto da página.
export default function JsonLd() {
  const { endereco, geo } = restaurante;

  const openingHoursSpecification = restaurante.horarios.flatMap((h) =>
    h.turnos.map(([abre, fecha]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.dias.map((d) => diasSchema[d]),
      opens: abre,
      closes: fecha,
    })),
  );

  const dados = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${restaurante.siteUrl}/#restaurante`,
    name: restaurante.nome,
    url: restaurante.siteUrl,
    image: `${restaurante.siteUrl}/images/og.jpg`,
    telephone: restaurante.telefoneE164,
    email: restaurante.email,
    foundingDate: String(restaurante.fundacao),
    servesCuisine: ["Mineira", "Brasileira", "Árabe"],
    priceRange: "$$",
    acceptsReservations: "True",
    hasMenu: `${restaurante.siteUrl}/cardapio`,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${endereco.rua}, ${endereco.complemento}`,
      addressLocality: endereco.cidade,
      addressRegion: endereco.uf,
      postalCode: endereco.cep,
      addressCountry: "BR",
    },
    geo: { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng },
    hasMap: restaurante.mapas.rota,
    openingHoursSpecification,
    sameAs: [restaurante.instagram.url],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
    />
  );
}
