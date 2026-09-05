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

  it("marca o que ainda não existe como 'em breve', sem link", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Mais/ }));

    const painel = screen.getByRole("dialog", { name: "Mais destinos" });

    for (const item of NAVEGACAO_SECUNDARIA.filter((i) => !i.disponivel)) {
      expect(
        within(painel).queryByRole("link", { name: item.rotulo })
      ).not.toBeInTheDocument();
      expect(within(painel).getByText(item.rotulo)).toBeInTheDocument();
    }

    expect(within(painel).getAllByText("em breve").length).toBeGreaterThan(0);
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
