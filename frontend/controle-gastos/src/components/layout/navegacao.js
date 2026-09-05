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
  { para: "/relatorios",    rotulo: "Relatórios",  icone: FiFileText, disponivel: false },
  { para: "/categorias",    rotulo: "Categorias",  icone: FiTag,      disponivel: false },
  { para: "/configuracoes", rotulo: "Ajustes",     icone: FiSettings, disponivel: false },
];

export const NAVEGACAO_MOBILE = NAVEGACAO.filter((item) => item.principal);
