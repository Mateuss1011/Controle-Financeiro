import {
  FiGrid, FiList, FiPieChart, FiTarget, FiFileText, FiTag, FiSettings,
} from "react-icons/fi";

/**
 * Destinos da área autenticada. `principal: true` marca os que aparecem na
 * navegação inferior do celular — os cinco mais usados; o restante fica no menu
 * completo do desktop.
 */
export const NAVEGACAO = [
  { para: "/dashboard",     rotulo: "Dashboard",   icone: FiGrid,     principal: true },
  { para: "/lancamentos",   rotulo: "Lançamentos", icone: FiList,     principal: true },
  { para: "/orcamento",     rotulo: "Orçamento",   icone: FiPieChart, principal: true },
  { para: "/metas",         rotulo: "Metas",       icone: FiTarget,   principal: true },
  { para: "/relatorios",    rotulo: "Relatórios",  icone: FiFileText },
  { para: "/categorias",    rotulo: "Categorias",  icone: FiTag },
  { para: "/configuracoes", rotulo: "Ajustes",     icone: FiSettings },
];

export const NAVEGACAO_MOBILE = NAVEGACAO.filter((item) => item.principal);
