import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { GastosProvider } from "../../Context/GastosProvider";
import LancamentosProvider from "../lancamentos/LancamentosProvider";
import CategoriasPage from "./CategoriasPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const CATEGORIAS = [
  { id: 1, nome: "Alimentação", tipo: "necessidade", rotulo_tipo: "Necessidades", global: true, total_lancamentos: 4 },
  { id: 2, nome: "Farmácia", tipo: "necessidade", rotulo_tipo: "Necessidades", global: false, total_lancamentos: 0 },
  { id: 3, nome: "Lazer", tipo: "desejo", rotulo_tipo: "Desejos", global: true, total_lancamentos: 2 },
  { id: 4, nome: "Cripto", tipo: "poupanca", rotulo_tipo: "Poupança", global: false, total_lancamentos: 3 },
];

function responder(categorias = CATEGORIAS) {
  api.get.mockImplementation((url) => {
    if (url === "/categorias") return Promise.resolve({ data: { data: categorias } });
    return Promise.resolve({ data: { data: [] } });
  });
}

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <GastosProvider>
          <LancamentosProvider>
            <CategoriasPage />
          </LancamentosProvider>
        </GastosProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  responder();
});

describe("Categorias — listagem", () => {
  it("agrupa as categorias pelas três faixas da regra", async () => {
    const { container } = montar();

    await screen.findByText("Farmácia");

    const cartoes = [...container.querySelectorAll(".cf-card")];
    const necessidades = cartoes.find((c) => c.textContent.includes("Necessidades"));
    const poupanca = cartoes.find((c) => c.textContent.includes("Poupança"));

    expect(within(necessidades).getByText("Alimentação")).toBeInTheDocument();
    expect(within(necessidades).getByText("Farmácia")).toBeInTheDocument();
    expect(within(necessidades).queryByText("Lazer")).not.toBeInTheDocument();
    expect(within(poupanca).getByText("Cripto")).toBeInTheDocument();
  });

  it("mostra o limite de cada faixa", async () => {
    montar();

    await screen.findByText("Farmácia");

    expect(screen.getByText("até 50% da renda")).toBeInTheDocument();
    expect(screen.getByText("até 30% da renda")).toBeInTheDocument();
    expect(screen.getByText("meta de 20% da renda")).toBeInTheDocument();
  });

  it("informa quantos lançamentos usam cada categoria", async () => {
    montar();

    await screen.findByText("Farmácia");

    expect(screen.getByText("4 lançamentos")).toBeInTheDocument();
    expect(screen.getByText("0 lançamentos")).toBeInTheDocument();
  });

  it("usa o singular com um lançamento só", async () => {
    responder([{ ...CATEGORIAS[1], total_lancamentos: 1 }]);
    montar();

    expect(await screen.findByText("1 lançamento")).toBeInTheDocument();
  });

  /** A ausência dos botões precisa ter explicação visível, senão parece bug. */
  it("marca as categorias do sistema e não oferece editar nem excluir", async () => {
    const { container } = montar();

    await screen.findByText("Alimentação");

    expect(
      screen.queryByRole("button", { name: "Editar categoria Alimentação" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Excluir categoria Alimentação" })
    ).not.toBeInTheDocument();
    // A etiqueta, não a ressalva do rodapé, que também fala "do sistema".
    expect(container.querySelectorAll(".cf-categoria__padrao")).toHaveLength(2);

    // As próprias continuam editáveis.
    expect(
      screen.getByRole("button", { name: "Editar categoria Farmácia" })
    ).toBeInTheDocument();
  });

  it("mostra erro amigável, sem detalhe técnico, e permite tentar de novo", async () => {
    api.get.mockRejectedValue({
      response: { status: 500, data: { message: "SQLSTATE[42S02]" }, headers: {} },
    });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar suas categorias");
    expect(alerta.textContent).not.toMatch(/SQLSTATE|vendor|exception/i);

    responder();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Farmácia")).toBeInTheDocument();
  });
});

describe("Categorias — criar e editar", () => {
  it("cria uma categoria explicando o efeito do tipo", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 9 } } });
    montar();

    await screen.findByText("Farmácia");
    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Nome/), "Pets");
    await userEvent.selectOptions(within(modal).getByLabelText(/Tipo/), "desejo");

    expect(within(modal).getByText(/Teto de 30% da renda/)).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole("button", { name: "Criar categoria" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/categorias", { nome: "Pets", tipo: "desejo" })
    );
  });

  it("avisa que trocar o tipo reclassifica os lançamentos antigos", async () => {
    montar();

    await screen.findByText("Farmácia");
    await userEvent.click(screen.getByRole("button", { name: "Editar categoria Cripto" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/reclassifica todos os lançamentos/);
    expect(within(modal).getByLabelText(/Nome/)).toHaveValue("Cripto");
  });

  it("mostra o erro de validação no campo que o originou", async () => {
    api.post.mockRejectedValue({
      response: {
        status: 422,
        data: { message: "erro", errors: { nome: ["Já existe uma categoria com esse nome."] } },
        headers: {},
      },
    });
    montar();

    await screen.findByText("Farmácia");
    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Nome/), "Alimentação");
    await userEvent.click(within(modal).getByRole("button", { name: "Criar categoria" }));

    expect(
      await within(modal).findByText("Já existe uma categoria com esse nome.")
    ).toBeInTheDocument();
  });

  it("bloqueia o envio sem nome", async () => {
    montar();

    await screen.findByText("Farmácia");
    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("button", { name: "Criar categoria" })).toBeDisabled();
  });
});

describe("Categorias — exclusão", () => {
  it("exclui uma categoria sem lançamentos", async () => {
    api.delete.mockResolvedValue({ data: { message: "ok" } });
    montar();

    await screen.findByText("Farmácia");
    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria Farmácia" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/não tem nenhum lançamento/);

    await userEvent.click(within(modal).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/categorias/2"));
  });

  /**
   * O impedimento é conhecido antes do clique: deixar tentar e devolver 422
   * transformaria uma regra previsível numa surpresa.
   */
  it("impede a exclusão de categoria em uso antes de tentar", async () => {
    montar();

    await screen.findByText("Cripto");
    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria Cripto" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/3 lançamentos e não pode ser excluída/);
    expect(within(modal).getByRole("button", { name: "Excluir" })).toBeDisabled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
