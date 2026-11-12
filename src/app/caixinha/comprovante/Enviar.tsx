"use client";

// Mandar o comprovante: o texto abre no WhatsApp para escolher a conversa; o
// PDF, no celular, abre o compartilhar (WhatsApp aparece na lista). Onde não
// dá para compartilhar arquivo (computador), o PDF é baixado.

import { useState } from "react";

export default function Enviar({ texto, pdf, arquivo }: { texto: string; pdf: string; arquivo: string }) {
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviarPdf() {
    setOcupado(true);
    setAviso("");
    try {
      const r = await fetch(pdf);
      if (!r.ok) throw new Error(await r.text());
      const file = new File([await r.blob()], arquivo, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = arquivo;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setAviso("PDF baixado. Anexe no WhatsApp.");
      }
    } catch (e) {
      // cancelar o compartilhar não é erro
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setAviso(e instanceof Error && e.message ? e.message : "Não deu para gerar o PDF.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-btn p-btn-primario"
      >
        Enviar texto no WhatsApp
      </a>
      <button type="button" onClick={enviarPdf} disabled={ocupado} className="p-btn p-btn-secundario">
        {ocupado ? "Gerando…" : "Enviar PDF"}
      </button>
      <a href={pdf} target="_blank" rel="noopener" className="p-btn p-btn-fantasma">
        Ver PDF
      </a>
      {aviso ? (
        <p className="basis-full text-sm text-cafe" role="status">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
