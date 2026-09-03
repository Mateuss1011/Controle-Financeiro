import { NavLink } from "react-router-dom";
import { FiPlus, FiLogOut } from "react-icons/fi";
import { NAVEGACAO, NAVEGACAO_MOBILE } from "./navegacao";
import "./AppShell.css";

/**
 * Casca da área autenticada.
 *
 * Desktop: barra lateral fixa. Celular: topo enxuto + navegação inferior com os
 * cinco destinos mais usados; o resto vai para "Mais". O botão de novo
 * lançamento é permanente nos dois — é a ação que o usuário mais repete.
 */


export default function AppShell({
  children,
  usuario,
  onSair,
  onNovoLancamento,
}) {
  const iniciais = (usuario?.name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <div className="cf-shell">
      <a className="cf-pular-para-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>

      {/* -------------------------------------------------- Sidebar (desktop) */}
      <aside className="cf-sidebar">
        <div className="cf-sidebar__marca">
          <span className="cf-sidebar__logo" aria-hidden="true">CF</span>
          <span className="cf-sidebar__nome">Controle&nbsp;Financeiro</span>
        </div>

        <div className="cf-sidebar__acao">
          <button
            type="button"
            className="cf-btn cf-btn--primario cf-btn--md cf-btn--bloco"
            onClick={onNovoLancamento}
          >
            <FiPlus aria-hidden="true" />
            <span>Novo lançamento</span>
          </button>
        </div>

        <nav className="cf-sidebar__nav" aria-label="Navegação principal">
          {NAVEGACAO.map(({ para, rotulo, icone: Icone, disponivel }) =>
            disponivel ? (
              <NavLink
                key={para}
                to={para}
                className={({ isActive }) =>
                  `cf-navitem ${isActive ? "cf-navitem--ativo" : ""}`
                }
              >
                <Icone className="cf-navitem__icone" aria-hidden="true" />
                <span>{rotulo}</span>
              </NavLink>
            ) : (
              <span key={para} className="cf-navitem cf-navitem--indisponivel">
                <Icone className="cf-navitem__icone" aria-hidden="true" />
                <span>{rotulo}</span>
                <span className="cf-navitem__breve">em breve</span>
              </span>
            )
          )}
        </nav>

        <div className="cf-sidebar__rodape">
          <div className="cf-usuario">
            <span className="cf-usuario__avatar" aria-hidden="true">{iniciais}</span>
            <span className="cf-usuario__dados">
              <span className="cf-usuario__nome">{usuario?.name ?? "—"}</span>
              <span className="cf-usuario__email">{usuario?.email ?? ""}</span>
            </span>
          </div>
          <button
            type="button"
            className="cf-btn cf-btn--fantasma cf-btn--sm cf-btn--bloco"
            onClick={onSair}
          >
            <FiLogOut aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------- Topbar (mobile) */}
      <header className="cf-topbar">
        <span className="cf-topbar__marca">
          <span className="cf-sidebar__logo" aria-hidden="true">CF</span>
          Controle Financeiro
        </span>
        <button
          type="button"
          className="cf-btn cf-btn--fantasma cf-btn--sm"
          onClick={onSair}
          aria-label="Sair da conta"
        >
          <FiLogOut aria-hidden="true" />
        </button>
      </header>

      <main className="cf-conteudo" id="conteudo">
        <div className="cf-conteudo__interno">{children}</div>
      </main>

      {/* ------------------------------------------ Navegação inferior (mobile) */}
      <nav className="cf-navbottom" aria-label="Navegação principal">
        {NAVEGACAO_MOBILE.map(({ para, rotulo, icone: Icone, disponivel }) =>
          disponivel ? (
            <NavLink
              key={para}
              to={para}
              className={({ isActive }) =>
                `cf-navbottom__item ${isActive ? "cf-navbottom__item--ativo" : ""}`
              }
            >
              <Icone aria-hidden="true" />
              <span>{rotulo}</span>
            </NavLink>
          ) : (
            <span
              key={para}
              className="cf-navbottom__item cf-navbottom__item--indisponivel"
              aria-disabled="true"
            >
              <Icone aria-hidden="true" />
              <span>{rotulo}</span>
            </span>
          )
        )}
      </nav>

      <button
        type="button"
        className="cf-fab"
        onClick={onNovoLancamento}
        aria-label="Novo lançamento"
      >
        <FiPlus aria-hidden="true" />
      </button>
    </div>
  );
}
