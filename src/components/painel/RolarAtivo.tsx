"use client";

// Nas abas do celular, que rolam de lado, traz a aba da página atual para a vista.

import { useEffect, useRef } from "react";

export default function RolarAtivo() {
  const marca = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const ativo = marca.current?.parentElement?.querySelector<HTMLElement>('[aria-current="page"]');
    ativo?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);
  return <span ref={marca} hidden />;
}
