"use client";

// Renderiza o HTML final (o mesmo que sai no envio) isolado do resto do app
// via iframe — evita que o Tailwind da tela vaze pra dentro da pré-visualização.
export function EmailPreview({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={html}
      title="Pré-visualização do e-mail"
      sandbox=""
      className="h-[500px] w-full rounded-md border border-border-1 bg-white"
    />
  );
}
