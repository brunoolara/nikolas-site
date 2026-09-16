import Link from "next/link";
import { restaurante } from "@/data/restaurante";
import { formatarTurnos } from "@/lib/horarios";
import Logo from "./Logo";

export default function Footer() {
  const { endereco } = restaurante;
  return (
    <footer className="bg-tinta text-papel/80 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-3 text-papel">
            <Logo className="h-8 w-8" variante="claro" />
            <span className="font-display text-2xl">Nikola&rsquo;s</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed">
            Restaurante tradicional em Ouro Fino, sul de Minas Gerais, desde {restaurante.fundacao}.
          </p>
        </div>

        <div>
          <h2 className="text-papel font-semibold">Endereço</h2>
          <address className="not-italic mt-3 text-sm leading-relaxed">
            {endereco.rua}, {endereco.complemento}
            <br />
            {endereco.bairro}, {endereco.cidade} - {endereco.uf}
            <br />
            {endereco.cep}
          </address>
        </div>

        <div>
          <h2 className="text-papel font-semibold">Horários</h2>
          <ul className="mt-3 text-sm leading-relaxed space-y-1">
            {restaurante.horarios.map((h) => (
              <li key={h.rotulo}>
                {h.rotulo}: {formatarTurnos(h.turnos)}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-papel font-semibold">Contato</h2>
          <ul className="mt-3 text-sm leading-relaxed space-y-1">
            <li>
              <a href={restaurante.whatsapp.contato} target="_blank" rel="noopener" className="hover:text-papel">
                WhatsApp {restaurante.telefoneExibicao}
              </a>
            </li>
            <li>
              <a href={`mailto:${restaurante.email}`} className="hover:text-papel break-all">
                {restaurante.email}
              </a>
            </li>
            <li>
              <a href={restaurante.instagram.url} target="_blank" rel="noopener" className="hover:text-papel">
                Instagram {restaurante.instagram.handle}
              </a>
            </li>
          </ul>
          <nav aria-label="Rodapé" className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/cardapio" className="hover:text-papel">Cardápio</Link>
            <Link href="/delivery" className="hover:text-papel">Delivery</Link>
            <Link href="/sobre" className="hover:text-papel">Nossa história</Link>
            <Link href="/contato" className="hover:text-papel">Contato</Link>
          </nav>
        </div>
      </div>
      <div className="border-t border-papel/10">
        <p className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-papel/50">
          © {new Date().getFullYear()} {restaurante.nome}. Ouro Fino, MG.
        </p>
      </div>
    </footer>
  );
}
