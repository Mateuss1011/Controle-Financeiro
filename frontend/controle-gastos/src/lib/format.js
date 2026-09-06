/*
 * Formatação e cálculo seguro de números financeiros.
 *
 * Existe um motivo concreto para centralizar isto: a versão anterior formatava
 * dinheiro de três jeitos diferentes em três telas, e dividia por um salário
 * que podia ser zero, produzindo "Infinity% do salário" e barras com
 * `width: Infinity%`. Nada aqui devolve Infinity ou NaN.
 */

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const MOEDA_COMPACTA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Converte qualquer entrada num número finito. Nunca devolve NaN. */
export function numero(valor) {
  const n = typeof valor === "number" ? valor : Number.parseFloat(valor);
  return Number.isFinite(n) ? n : 0;
}

/** R$ 2.086,65 */
export function formatarMoeda(valor) {
  return MOEDA.format(numero(valor));
}

/** R$ 2,1 mil — para eixos de gráfico e telas estreitas. */
export function formatarMoedaCompacta(valor) {
  return MOEDA_COMPACTA.format(numero(valor));
}

/**
 * Percentual de `parte` sobre `total`.
 *
 * Total zero, negativo ou ausente devolve 0 — é o caso do usuário que ainda não
 * registrou renda, e ele não pode virar Infinity na interface.
 */
export function percentualSeguro(parte, total) {
  const t = numero(total);
  if (t <= 0) return 0;

  const resultado = (numero(parte) / t) * 100;
  return Number.isFinite(resultado) ? resultado : 0;
}

/** 76,4% */
export function formatarPercentual(valor, casas = 1) {
  return `${numero(valor).toFixed(casas).replace(".", ",")}%`;
}

/** Limita um percentual a 0–100 para uso em largura de barra de progresso. */
export function percentualParaBarra(valor) {
  return Math.min(100, Math.max(0, numero(valor)));
}

/** '2026-09-01' -> '01/09/2026', sem o deslocamento de fuso do `new Date`. */
export function formatarData(iso) {
  if (!iso) return "—";

  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";

  return `${dia}/${mes}/${ano}`;
}

/** '2026-09' -> 'setembro de 2026' */
export function formatarCompetencia(competencia) {
  if (!competencia) return "—";

  const [ano, mes] = String(competencia).split("-");
  const nome = MESES[Number.parseInt(mes, 10) - 1];

  return nome ? `${nome} de ${ano}` : "—";
}

/** '2026-09' -> 'set/2026' — para seletores e rótulos curtos. */
export function formatarCompetenciaCurta(competencia) {
  if (!competencia) return "—";

  const [ano, mes] = String(competencia).split("-");
  const nome = MESES[Number.parseInt(mes, 10) - 1];

  return nome ? `${nome.slice(0, 3)}/${ano}` : "—";
}

/** Competência do mês corrente, no formato aceito pela API. */
export function competenciaAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Caminho da categoria de um lancamento: "Moradia > Aluguel" quando ele esta
 * numa subcategoria, so o nome quando esta direto na principal.
 *
 * Mostrar so "Aluguel" esconderia a informacao que o Dashboard usa para somar
 * e que o orcamento de Moradia consome — e as duas telas passariam a chamar o
 * mesmo dinheiro por nomes diferentes.
 */
export function caminhoDaCategoria(categoria) {
  if (!categoria?.nome) return null;

  return categoria.categoria_pai
    ? `${categoria.categoria_pai} › ${categoria.nome}`
    : categoria.nome;
}
