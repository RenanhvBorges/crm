import { z } from "zod";

const align = z.enum(["left", "center", "right"]);

const headingBlock = z.object({
  id: z.string(),
  type: z.literal("heading"),
  text: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  align,
});

const textBlock = z.object({
  id: z.string(),
  type: z.literal("text"),
  html: z.string(),
  align,
});

const imageBlock = z.object({
  id: z.string(),
  type: z.literal("image"),
  src: z.string(),
  alt: z.string(),
  href: z.string().optional(),
  width: z.number().optional(),
  align,
});

const buttonBlock = z.object({
  id: z.string(),
  type: z.literal("button"),
  label: z.string(),
  href: z.string(),
  align,
  bgColor: z.string(),
  textColor: z.string(),
});

const dividerBlock = z.object({
  id: z.string(),
  type: z.literal("divider"),
  color: z.string(),
});

const spacerBlock = z.object({
  id: z.string(),
  type: z.literal("spacer"),
  height: z.number(),
});

export const emailBlockSchema = z.discriminatedUnion("type", [
  headingBlock,
  textBlock,
  imageBlock,
  buttonBlock,
  dividerBlock,
  spacerBlock,
]);

export const emailDocumentSchema = z.object({
  blocks: z.array(emailBlockSchema),
});

export type EmailBlock = z.infer<typeof emailBlockSchema>;
export type EmailDocument = z.infer<typeof emailDocumentSchema>;

export const EMPTY_EMAIL_DOCUMENT: EmailDocument = { blocks: [] };

// Aceita conteúdo persistido como jsonb (formato desconhecido em tempo de
// compilação) e devolve um documento válido, ou vazio se estiver corrompido.
export function parseEmailDocument(raw: unknown): EmailDocument {
  const result = emailDocumentSchema.safeParse(raw);
  return result.success ? result.data : EMPTY_EMAIL_DOCUMENT;
}

// Permite só a formatação inline mínima usada pelo bloco de texto (negrito,
// itálico, sublinhado, link, quebra de linha) — remove qualquer outra tag/atributo
// antes de gravar, já que o HTML vem de contentEditable e será enviado por e-mail.
const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "a", "br", "span"]);

export function sanitizeInlineHtml(html: string): string {
  if (typeof window === "undefined" && typeof DOMParser === "undefined") {
    // Ambiente sem DOM (server): não deveria receber HTML não sanitizado aqui,
    // mas evita quebrar o build — a sanitização real acontece no cliente, no blur.
    return html;
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node: Element) {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Substitui a tag não permitida pelo seu conteúdo (não descarta o texto).
      const parent = child.parentNode!;
      while (child.firstChild) parent.insertBefore(child.firstChild, child);
      parent.removeChild(child);
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      if (tag === "a" && attr.name === "href") continue;
      child.removeAttribute(attr.name);
    }
    sanitizeNode(child);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBlock(block: EmailBlock): string {
  const cell = (inner: string, extraStyle = "") =>
    `<tr><td style="padding:0 24px 16px;${extraStyle}">${inner}</td></tr>`;

  switch (block.type) {
    case "heading": {
      const size = block.level === 1 ? "28px" : block.level === 2 ? "22px" : "18px";
      return cell(
        `<h${block.level} style="margin:0;font-family:Arial,sans-serif;font-size:${size};font-weight:700;color:#111827;text-align:${block.align};">${escapeHtml(block.text)}</h${block.level}>`,
      );
    }
    case "text":
      return cell(
        `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;text-align:${block.align};">${block.html}</div>`,
      );
    case "image": {
      const img = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" style="max-width:100%;display:block;margin:${block.align === "center" ? "0 auto" : block.align === "right" ? "0 0 0 auto" : "0"};" ${block.width ? `width="${block.width}"` : ""} />`;
      return cell(block.href ? `<a href="${escapeHtml(block.href)}">${img}</a>` : img);
    }
    case "button": {
      const justify =
        block.align === "center" ? "center" : block.align === "right" ? "flex-end" : "flex-start";
      return cell(
        `<table role="presentation" align="${block.align === "left" ? "left" : block.align === "right" ? "right" : "center"}" style="margin:${block.align === "center" ? "0 auto" : "0"};"><tr><td style="border-radius:6px;background:${block.bgColor};"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:12px 24px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:${block.textColor};text-decoration:none;">${escapeHtml(block.label)}</a></td></tr></table>`,
        `display:flex;justify-content:${justify};`,
      );
    }
    case "divider":
      return cell(`<hr style="border:none;border-top:1px solid ${block.color};margin:0;" />`);
    case "spacer":
      return `<tr><td style="height:${block.height}px;line-height:${block.height}px;font-size:0;">&nbsp;</td></tr>`;
  }
}

// Gera o HTML de envio/preview a partir dos blocos: tabelas com estilo inline,
// já que clientes de e-mail (Outlook em especial) não suportam flexbox/grid/CSS
// externo de forma confiável. Nunca renderizar os blocos via DOM do editor.
export function renderBlocksToHtml(doc: EmailDocument): string {
  const rows = doc.blocks.map(renderBlock).join("\n");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px 0;background:#f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
            ${rows}
            <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function newBlockId(): string {
  return crypto.randomUUID();
}

// Documento inicial para uma campanha/template com conteúdo simples (usado
// pelo formulário de textarea até o editor de blocos entrar no lugar).
export function textOnlyDocument(plainText: string): EmailDocument {
  const html = escapeHtml(plainText).replace(/\n/g, "<br />");
  return { blocks: [{ id: newBlockId(), type: "text", html, align: "left" }] };
}

// Extrai um texto plano aproximado de volta de um documento (para reabrir o
// campo simples quando o conteúdo ainda não usa o editor de blocos completo).
export function documentToPlainText(doc: EmailDocument): string {
  if (doc.blocks.length === 1 && doc.blocks[0].type === "text") {
    return doc.blocks[0].html.replace(/<br\s*\/?>/g, "\n").replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
  }
  return "";
}
