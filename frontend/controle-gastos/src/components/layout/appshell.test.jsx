import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppShell from "./AppShell";
import { NAVEGACAO, NAVEGACAO_MOBILE, NAVEGACAO_SECUNDARIA } from "./navegacao";

function montar(rota = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route
          path="*"
          element={
            <AppShell
              usuario={{ name: "Maria Silva", email: "maria@exemplo.com" }}
              onSair={vi.fn()}
              onNovoLancamento={vi.fn()}
            >
              <p>conteúdo</p>
            </AppShell>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Regressão da Fase I: a barra inferior do celular tem quatro lugares e a
 * barra lateral não existe abaixo de 900px. Sem o "Mais", Orçamento e
 * Relatórios estavam prontos e inalcançáveis no celular.
 */
describe("AppShell — todo destino disponível é alcançável no celular", () => {
  it("oferece no 'Mais' tudo que não cabe na barra inferior", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Mais/ }));

    const painel = screen.getByRole("dialog", { name: "Mais destinos" });

    for (const item of NAVEGACAO_SECUNDARIA.filter((i) => i.disponivel)) {
      expect(
        within(painel).getByRole("link", { name: item.rotulo })
      ).toHaveAttribute("href", item.para);
    }
  });

  it("nenhum destino disponível fica de fora da barra e do 'Mais' somados", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Mais/ }));

    const alcancaveis = new Set(
      [...NAVEGACAO_MOBILE, ...NAVEGACAO_SECUNDARIA]
        .filter((i) => i.disponivel)
        .map((i) => i.para)
    );

    for (const item of NAVEGACAO.filter((i) => i.disponivel)) {
      expect(alcancaveis).toContain(item.para);
    }
  });

  /*
   * Desde a Fase J não sobrou nenhum destino "em breve" — o teste continua
   * porque a regra segue valendo para o próximo que entrar no menu: aparece,
   * mas não vira link. A contagem de etiquetas acompanha a lista em vez de ser
   * fixada num número, senão o teste quebraria a cada destino concluído (foi o
   * que aconteceu quando Categorias e Ajustes ficaram prontos).
   */
  it("marca o que ainda não existe como 'em breve', sem link", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Mais/ }));

    const painel = screen.getByRole("dialog", { name: "Mais destinos" });
    const pendentes = NAVEGACAO_SECUNDARIA.filter((i) => !i.disponivel);

    for (const item of pendentes) {
      expect(
        within(painel).queryByRole("link", { name: item.rotulo })
      ).not.toBeInTheDocument();
      expect(within(painel).getByText(item.rotulo)).toBeInTheDocument();
    }

    expect(within(painel).queryAllByText("em breve")).toHaveLength(pendentes.length);
  });

  it("fecha com Escape e pelo botão de fechar", async () => {
    montar();

    const abrir = screen.getByRole("button", { name: /Mais/ });

    await userEvent.click(abrir);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(abrir);
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /** O painel por cima da tela recém-aberta seria pior do que não abrir nada. */
  it("fecha ao navegar para um destino do painel", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Mais/ }));
    await userEvent.click(screen.getByRole("link", { name: "Relatórios" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("destaca 'Mais' quando a tela aberta mora dentro dele", async () => {
    montar("/relatorios");

    expect(screen.getByRole("button", { name: /Mais/ })).toHaveClass(
      "cf-navbottom__item--ativo"
    );
  });
});

/*
 * O painel cobre a tela e o que esta atras continua alcancavel por Tab: sem
 * contencao, quem navega por teclado sai do painel sem perceber e passa a
 * operar uma interface que nao esta vendo.
 */
describe("AppShell — foco preso no painel 'Mais'", () => {
  const abrir = async () => {
    const gatilho = screen.getByRole("button", { name: /Mais/ });
    await userEvent.click(gatilho);
    return gatilho;
  };

  const focaveisDoPainel = () => {
    const painel = screen.getByRole("dialog", { name: "Mais destinos" });
    return [...painel.querySelectorAll('a[href], button:not([disabled])')];
  };

  it("anuncia-se como modal", async () => {
    montar();
    await abrir();

    expect(screen.getByRole("dialog", { name: "Mais destinos" })).toHaveAttribute(
      "aria-modal",
      "true"
    );
  });

  /** Quem abre "Mais" quer escolher um destino: o foco ja comeca em um. */
  it("leva o foco para o primeiro interativo ao abrir", async () => {
    montar();
    await abrir();

    expect(document.activeElement).toBe(focaveisDoPainel()[0]);
  });

  it("Tab no ultimo elemento volta para o primeiro", async () => {
    montar();
    await abrir();

    const lista = focaveisDoPainel();
    lista[lista.length - 1].focus();

    await userEvent.tab();

    expect(document.activeElement).toBe(lista[0]);
  });

  it("Shift+Tab no primeiro elemento vai para o ultimo", async () => {
    montar();
    await abrir();

    const lista = focaveisDoPainel();
    lista[0].focus();

    await userEvent.tab({ shift: true });

    expect(document.activeElement).toBe(lista[lista.length - 1]);
  });

  /** Percorrer o painel inteiro nao pode cair na pagina atras. */
  it("o foco nao escapa do painel ao percorrer todos os itens", async () => {
    montar();
    await abrir();
    const painel = screen.getByRole("dialog", { name: "Mais destinos" });

    for (let passo = 0; passo < focaveisDoPainel().length + 3; passo++) {
      await userEvent.tab();
      expect(painel.contains(document.activeElement)).toBe(true);
    }
  });

  it("devolve o foco ao botao que abriu, ao fechar com Escape", async () => {
    montar();
    const gatilho = await abrir();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(gatilho);
  });

  it("devolve o foco ao botao que abriu, ao fechar pelo X", async () => {
    montar();
    const gatilho = await abrir();

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(document.activeElement).toBe(gatilho);
  });
});
