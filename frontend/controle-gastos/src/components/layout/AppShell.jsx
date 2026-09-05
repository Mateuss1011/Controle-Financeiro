import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiPlus, FiLogOut, FiMoreHorizontal, FiX } from "react-icons/fi";
import { NAVEGACAO, NAVEGACAO_MOBILE, NAVEGACAO_SECUNDARIA } from "./navegacao";
import "./AppShell.css";

/**
 * Casca da área autenticada.
 *
 * Desktop: barra lateral fixa. Celular: topo enxuto + navegação inferior com os
 * destinos mais usados; o resto abre em "Mais". O botão de novo lançamento é
 * permanente nos dois — é a ação que o usuário mais repete.
 */
export default function AppShell({
  children,
  usuario,
  onSair,
  onNovoLancamento,
}) {
  const [maisAberto, setMaisAberto] = useState(false);
  const { pathname } = useLocation();
  const painelMais = useRef(null);
  const gatilhoMais = useRef(null);

  // Navegar fecha o painel: sem isso ele fica por cima da tela recém-aberta.
  useEffect(() => setMaisAberto(false), [pathname]);

  /**
   * Foco preso no painel enquanto ele está aberto.
   *
   * O painel cobre a tela e o que está atrás continua alcançável por Tab: sem
   * contenção, quem navega por teclado sai do painel sem perceber e passa a
   * operar uma interface que não está vendo. Escape fecha, e o foco volta para
   * o botão que abriu — sem isso ele cai no início do documento e a pessoa
   * perde o lugar.
   *
   * Feito à mão porque é uma tela só: uma biblioteca de foco para isto seria
   * mais dependência do que problema.
   */
  useEffect(() => {
    if (!maisAberto) return;

    // O gatilho é capturado AGORA, na abertura, e não lido no cleanup: é o
    // elemento que estava lá quando o painel abriu que deve receber o foco de
    // volta, mesmo que o botão tenha sido substituído nesse meio-tempo.
    const gatilho = gatilhoMais.current;

    // Sem filtro por `offsetParent`: ele mede layout, e onde não há layout
    // (jsdom, e portanto os testes) devolve null para tudo — a lista virava
    // vazia e o trap simplesmente não existia, silenciosamente. O painel só
    // renderiza filhos visíveis, então o seletor já basta.
    const focaveis = () => [
      ...(painelMais.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []),
    ];

    // O primeiro interativo, e não o painel em si — na prática o botão de
    // fechar, que é o primeiro na ordem do DOM. Começar pela saída é a escolha
    // conservadora: quem abriu sem querer sai com um Enter, e os destinos ficam
    // a um Tab.
    focaveis()[0]?.focus();

    const aoTeclar = (evento) => {
      if (evento.key === "Escape") {
        setMaisAberto(false);
        return;
      }

      if (evento.key !== "Tab") return;

      const lista = focaveis();
      if (lista.length === 0) return;

      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const atual = document.activeElement;

      // Também traz de volta o foco que já estivesse fora do painel — é o caso
      // de quem apertou Tab antes de o foco inicial ser aplicado.
      if (!painelMais.current?.contains(atual)) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primeiro).focus();
        return;
      }

      if (evento.shiftKey && atual === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      // Devolve o foco a quem abriu. O `isConnected` protege o caso em que o
      // painel fechou porque a navegação trocou a página inteira.
      if (gatilho?.isConnected) gatilho.focus();
    };
  }, [maisAberto]);

  const emSecundaria = NAVEGACAO_SECUNDARIA.some(
    (item) => item.disponivel && pathname.startsWith(item.para)
  );
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

        {/* A barra tem quatro lugares e a sidebar não existe no celular:
            sem este botão, Orçamento e Relatórios ficariam inalcançáveis. */}
        <button
          type="button"
          ref={gatilhoMais}
          className={`cf-navbottom__item ${emSecundaria ? "cf-navbottom__item--ativo" : ""}`}
          onClick={() => setMaisAberto((aberto) => !aberto)}
          aria-expanded={maisAberto}
          aria-haspopup="dialog"
        >
          <FiMoreHorizontal aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {maisAberto && (
        <>
          <div
            className="cf-mais__fundo"
            onClick={() => setMaisAberto(false)}
            aria-hidden="true"
          />
          <div
            className="cf-mais"
            role="dialog"
            aria-modal="true"
            aria-label="Mais destinos"
            ref={painelMais}
          >
            <div className="cf-mais__topo">
              <span className="cf-mais__titulo">Mais</span>
              <button
                type="button"
                className="cf-btn cf-btn--fantasma cf-btn--sm"
                onClick={() => setMaisAberto(false)}
                aria-label="Fechar"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>

            <nav className="cf-mais__lista" aria-label="Outros destinos">
              {NAVEGACAO_SECUNDARIA.map(({ para, rotulo, icone: Icone, disponivel }) =>
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
          </div>
        </>
      )}

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
