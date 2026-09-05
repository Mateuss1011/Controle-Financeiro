import {
  FiGrid, FiList, FiDollarSign, FiPieChart, FiTarget, FiFileText, FiTag, FiSettings,
} from "react-icons/fi";

/**
 * Destinos da área autenticada.
 *
 * `principal` marca os que aparecem na navegação inferior do celular.
 *
 * `disponivel: false` marca o que ainda não foi construído. O item continua
 * visível — para o usuário entender o escopo do produto — mas não é clicável e
 * se anuncia como "em breve". Um menu com item que leva a tela em branco é pior
 * do que um menu honesto sobre o que ainda não existe.
 */
export const NAVEGACAO = [
  { para: "/dashboard",     rotulo: "Dashboard",   icone: FiGrid,     principal: true, disponivel: true },
  { para: "/lancamentos",   rotulo: "Lançamentos", icone: FiList,       principal: true, disponivel: true },
  { para: "/renda",         rotulo: "Renda",       icone: FiDollarSign, principal: true, disponivel: true },
  { para: "/orcamento",     rotulo: "Orçamento",   icone: FiPieChart,   disponivel: true },
  { para: "/metas",         rotulo: "Metas",       icone: FiTarget,     principal: true, disponivel: true },
  { para: "/relatorios",    rotulo: "Relatórios",  icone: FiFileText,   disponivel: true },
  { para: "/categorias",    rotulo: "Categorias",  icone: FiTag,        disponivel: true },
  { para: "/ajustes",       rotulo: "Ajustes",     icone: FiSettings,   disponivel: true },
];

export const NAVEGACAO_MOBILE = NAVEGACAO.filter((item) => item.principal);

/**
 * O que nao cabe na barra inferior do celular.
 *
 * Sem esta lista, Orcamento e Relatorios existiam so no desktop: a barra tem
 * quatro lugares e a sidebar nao aparece no celular. Uma tela pronta e
 * inalcancavel e uma tela que nao existe.
 */
export const NAVEGACAO_SECUNDARIA = NAVEGACAO.filter((item) => !item.principal);
