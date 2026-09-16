"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { restaurante } from "@/data/restaurante";
import Logo from "./Logo";

const links = [
  { href: "/cardapio", rotulo: "Cardápio" },
  { href: "/delivery", rotulo: "Delivery" },
  { href: "/sobre", rotulo: "Nossa história" },
  { href: "/contato", rotulo: "Contato" },
];

export default function Header() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-papel/95 backdrop-blur border-b border-linha">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Nikola's Restaurante, página inicial">
          <Logo className="h-8 w-8" />
          <span className="font-display text-2xl leading-none">Nikola&rsquo;s</span>
        </Link>

        <nav aria-label="Principal" className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className="text-[15px] font-medium text-tinta/80 hover:text-tinta aria-[current=page]:text-verde aria-[current=page]:underline underline-offset-8 decoration-2 decoration-chope"
            >
              {l.rotulo}
            </Link>
          ))}
          <a
            href={restaurante.whatsapp.reserva}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full bg-verde text-papel px-4 py-2 text-[15px] font-semibold hover:bg-verde-escuro"
          >
            <IconeWhatsApp className="h-4 w-4" />
            Reservar
          </a>
        </nav>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-linha"
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          onClick={() => setAberto((v) => !v)}
        >
          <span className="sr-only">{aberto ? "Fechar menu" : "Abrir menu"}</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {aberto ? (
              <path d="M4 4l12 12M16 4L4 16" />
            ) : (
              <path d="M2 5h16M2 10h16M2 15h16" />
            )}
          </svg>
        </button>
      </div>

      <nav
        id="menu-mobile"
        aria-label="Principal"
        hidden={!aberto}
        className="md:hidden border-t border-linha bg-papel"
      >
        <ul className="mx-auto max-w-6xl px-4 py-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                onClick={() => setAberto(false)}
                className="block py-3 text-lg font-medium border-b border-linha last:border-0 aria-[current=page]:text-verde"
              >
                {l.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function IconeWhatsApp({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.3 4.4c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6Z" />
    </svg>
  );
}
