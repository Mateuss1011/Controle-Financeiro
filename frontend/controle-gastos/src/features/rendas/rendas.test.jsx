import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { GastosContext } from "../../Context/gastosContext";
import LancamentosProvider from "../lancamentos/LancamentosProvider";
import RendasPage from "./RendasPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const COMPETENCIA_ATUAL = (() => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
})();

const COMPETENCIA_ANTERIOR = (() => {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

function resposta({ rendas, resumo = {} } = {}) {
  const lista = rendas ?? [
    { id: 2, valor: 5500, competencia: COMPETENCIA_ATUAL, descricao: "Salário" },
    { id: 1, valor: 5000, competencia: COMPETENCIA_ANTERIOR, descricao: null },
  ];

  return {
    data: {
      data: lista,
      resumo: {
        competencia_atual: COMPETENCIA_ATUAL,
        renda_atual: 5500,
        tem_renda_atual: true,
        total_registros: lista.length,
        media_12_meses: 5250,
        variacoes: {
          [COMPETENCIA_ANTERIOR]: {
            anterior: null, competencia_anterior: null,
            variacao_absoluta: null, variacao_percentual: null,
          },
          [COMPETENCIA_ATUAL]: {
            anterior: 5000, competencia_anterior: COMPETENCIA_ANTERIOR,
            variacao_absoluta: 500, variacao_percentual: 10,
          },
        },
        ...resumo,
      },
    },
  };
}

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <GastosContext.Provider
          value={{
            gastos: [], categorias: [],
            carregarGastos: vi.fn(), carregarCategorias: vi.fn(),
            deletarGasto: vi.fn(), atualizarGasto: vi.fn(),
          }}
        >
          <LancamentosProvider>
            <RendasPage />
          </LancamentosProvider>
        </GastosContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

/**
 * Espera a LISTA, nao o titulo do Card.
 *
 * "Histórico" e o titulo do cartao e ja esta na tela durante o
 * carregamento, com o esqueleto dentro. Esperar por ele deixa a assercao correr
 * antes das linhas chegarem — flake que apareceu de verdade na suite de Metas.
 */
async function aguardarLista() {
  await waitFor(() =>
    expect(document.querySelector(".cf-renda")).toBeInTheDocument()
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(resposta());
});

describe("Rendas — carregamento e erro", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { container } = montar();

    expect(container.querySelector(".cf-rendas__carregando")).toBeInTheDocument();
  });

  it("mostra erro amigável e permite tentar de novo", async () => {
    api.get.mockRejectedValue({
      response: { status: 500, data: { message: "SQLSTATE[HY000]" }, headers: {} },
    });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar suas rendas");
    expect(alerta.textContent).not.toMatch(/SQLSTATE|vendor|exception/i);

    api.get.mockResolvedValue(resposta());
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Histórico")).toBeInTheDocument();
  });
});

describe("Rendas — histórico", () => {
  it("lista as competências com valor", async () => {
    const { container } = montar();
    await aguardarLista();

    // O valor do mês corrente aparece também no indicador de topo, então a
    // leitura é feita dentro da lista.
    const lista = container.querySelector(".cf-rendas");
    expect(within(lista).getByText("R$ 5.500,00")).toBeInTheDocument();
    expect(within(lista).getByText("R$ 5.000,00")).toBeInTheDocument();
    expect(within(lista).getByText("Salário")).toBeInTheDocument();
  });

  /** Saber qual renda está valendo agora é a pergunta principal da tela. */
  it("marca a competência atual", async () => {
    const { container } = montar();

    await aguardarLista();

    expect(screen.getByText("Período atual")).toBeInTheDocument();
    expect(container.querySelectorAll(".cf-renda--atual")).toHaveLength(1);
  });

  it("mostra a variação em relação ao mês anterior", async () => {
    const { container } = montar();

    await aguardarLista();

    const variacoes = [...container.querySelectorAll(".cf-variacao")].map((e) => e.textContent);
    expect(variacoes.some((t) => t.includes("10,0%"))).toBe(true);
  });

  it("não inventa variação para a competência mais antiga", async () => {
    const { container } = montar();

    await aguardarLista();
    expect(container.querySelectorAll(".cf-renda__sem-variacao")).toHaveLength(1);
  });

  it("resume renda atual, média e total de períodos", async () => {
    montar();

    await aguardarLista();
    expect(screen.getAllByText("R$ 5.500,00").length).toBe(2);
    expect(screen.getByText("R$ 5.250,00")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("Rendas — estados vazios", () => {
  it("orienta quem ainda não registrou nenhuma renda", async () => {
    api.get.mockResolvedValue(
      resposta({
        rendas: [],
        resumo: { renda_atual: null, tem_renda_atual: false, total_registros: 0, media_12_meses: null, variacoes: {} },
      })
    );
    montar();

    expect(
      await screen.findByText("Você ainda não registrou nenhuma renda")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Registrar renda/ }).length).toBeGreaterThan(0);
    // Nada de parede de zeros: os indicadores só aparecem quando há histórico.
    expect(screen.queryByText("Média dos últimos 12 meses")).not.toBeInTheDocument();
  });

  /** Sem renda no mês corrente, o resto do produto fica sem base de cálculo. */
  it("explica quando a competência atual não tem renda", async () => {
    api.get.mockResolvedValue(
      resposta({
        rendas: [{ id: 1, valor: 5000, competencia: COMPETENCIA_ANTERIOR, descricao: null }],
        resumo: { renda_atual: null, tem_renda_atual: false, total_registros: 1 },
      })
    );
    montar();

    expect(await screen.findByText(/ainda não tem renda registrada/)).toBeInTheDocument();
    expect(screen.getByText(/sem limites da regra 50\/30\/20/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar agora" })).toBeInTheDocument();
    expect(screen.getByText("Não registrada")).toBeInTheDocument();
  });
});

describe("Rendas — registrar e editar", () => {
  it("registra a renda de uma competência", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 3 } } });
    montar();

    await aguardarLista();
    await userEvent.click(screen.getAllByRole("button", { name: /Registrar renda/ })[0]);

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Valor recebido/), "6200");
    await userEvent.type(within(modal).getByLabelText(/Descrição/), "Salário + freela");
    await userEvent.click(within(modal).getByRole("button", { name: "Registrar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/rendas", {
        valor: 6200,
        competencia: COMPETENCIA_ATUAL,
        descricao: "Salário + freela",
      })
    );
  });

  it("permite escolher uma competência passada", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 3 } } });
    montar();

    await aguardarLista();
    await userEvent.click(screen.getAllByRole("button", { name: /Registrar renda/ })[0]);

    const modal = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(modal).getByLabelText(/Competência/), COMPETENCIA_ANTERIOR);
    await userEvent.type(within(modal).getByLabelText(/Valor recebido/), "4800");
    await userEvent.click(within(modal).getByRole("button", { name: "Registrar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/rendas",
        expect.objectContaining({ competencia: COMPETENCIA_ANTERIOR, valor: 4800 })
      )
    );
  });

  /**
   * A unicidade por competência é a regra definida na Fase B: registrar de novo
   * o mesmo mês substitui. O aviso existe para isso nunca ser surpresa.
   */
  it("avisa que a competência escolhida já tem renda e será substituída", async () => {
    montar();

    await aguardarLista();
    await userEvent.click(screen.getAllByRole("button", { name: /Registrar renda/ })[0]);

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(/já tem renda registrada/)).toBeInTheDocument();
    expect(within(modal).getByText(/R\$ 5\.500,00, será substituído/)).toBeInTheDocument();
  });

  it("abre a edição preenchida e trava a competência", async () => {
    montar();

    await aguardarLista();
    await userEvent.click(
      screen.getAllByRole("button", { name: /^Editar renda de/ })[0]
    );

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Editar renda" })).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Valor recebido/)).toHaveValue(5500);
    expect(within(modal).getByLabelText(/Competência/)).toBeDisabled();
  });

  it("mostra o erro de validação no campo que o originou", async () => {
    api.post.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { valor: ["O valor não pode ser negativo."] } },
        headers: {},
      },
    });
    montar();

    await aguardarLista();
    await userEvent.click(screen.getAllByRole("button", { name: /Registrar renda/ })[0]);

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Valor recebido/), "100");
    await userEvent.click(within(modal).getByRole("button", { name: "Registrar" }));

    const erro = await within(modal).findByRole("alert");
    expect(erro).toHaveTextContent("O valor não pode ser negativo.");
    expect(within(modal).getByLabelText(/Valor recebido/)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Rendas — exclusão", () => {
  it("exclui somente após confirmação e explica o impacto", async () => {
    api.delete.mockResolvedValue({ data: { message: "ok" } });
    montar();

    await aguardarLista();
    await userEvent.click(
      screen.getAllByRole("button", { name: /^Excluir renda de/ })[0]
    );

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/A competência ficará sem renda/);
    expect(modal).toHaveTextContent(/Os lançamentos do período não são afetados/);
    expect(api.delete).not.toHaveBeenCalled();

    await userEvent.click(within(modal).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/rendas/2"));
  });

  it("cancelar não exclui nada", async () => {
    montar();

    await aguardarLista();
    await userEvent.click(
      screen.getAllByRole("button", { name: /^Excluir renda de/ })[0]
    );

    const modal = await screen.findByRole("dialog");
    await userEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));

    expect(api.delete).not.toHaveBeenCalled();
  });
});

describe("Rendas — consistência", () => {
  it("não renderiza NaN, Infinity nem undefined", async () => {
    const { container } = montar();

    await aguardarLista();
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
  });

  it("cada ação de linha tem nome acessível próprio", async () => {
    montar();

    await aguardarLista();

    expect(screen.getAllByRole("button", { name: /^Editar renda de/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Excluir renda de/ })).toHaveLength(2);
  });
});
