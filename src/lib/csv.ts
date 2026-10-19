// Exportação CSV no navegador. Separador ";" + BOM UTF-8 para abrir direto no
// Excel em pt-BR (que usa ";" e vírgula decimal) sem quebrar acentos.
const SEPARATOR = ";";

// Planilhas interpretam células que começam com = + - @ como fórmula. Como os
// dados vêm de usuários/formulários, neutraliza com apóstrofo (exceto números).
function escapeCell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) {
    text = `'${text}`;
  }
  if (/[";\r\n]/.test(text)) {
    text = `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR)).join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const blob = new Blob(["﻿", toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function csvFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
