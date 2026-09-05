/**
 * Geração de CSV para exportação.
 *
 * Duas decisões que parecem detalhe e não são:
 *
 *  - separador PONTO E VÍRGULA e decimal com VÍRGULA, porque o Excel em
 *    português quebra a linha inteira num arquivo separado por vírgula;
 *  - BOM UTF-8 no começo, senão "Alimentação" vira "AlimentaÃ§Ã£o" ao abrir.
 *
 * Campos são escapados sempre que contêm separador, aspas ou quebra de linha —
 * uma descrição com ponto e vírgula não pode deslocar as colunas.
 */

const SEPARADOR = ";";
const BOM = "﻿";

/** Número no formato que o Excel pt-BR entende como número. */
export function numeroParaCsv(valor) {
  const n = typeof valor === "number" ? valor : Number.parseFloat(valor);

  if (!Number.isFinite(n)) return "0,00";

  return n.toFixed(2).replace(".", ",");
}

function escapar(valor) {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor);

  return /["\n\r;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * @param {string[]} cabecalho
 * @param {Array<Array<string|number>>} linhas
 */
export function montarCsv(cabecalho, linhas) {
  return [cabecalho, ...linhas]
    .map((linha) => linha.map(escapar).join(SEPARADOR))
    .join("\r\n");
}

/**
 * Entrega o CSV como download.
 *
 * O object URL é revogado logo depois: sem isso o blob fica preso na memória da
 * aba até o recarregamento, e quem exporta várias vezes acumula todos.
 */
export function baixarCsv(nomeArquivo, conteudo) {
  const blob = new Blob([BOM + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
