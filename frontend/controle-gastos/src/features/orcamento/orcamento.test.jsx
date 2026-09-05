import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { GastosContext } from "../../Context/gastosContext";
import LancamentosProvider from "../lancamentos/LancamentosProvider";
import OrcamentoPage from "./OrcamentoPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const CATEGORIAS = [
  { id: 1, nome: "Alimentação", tipo: "necessidade", rotulo_tipo: "Necessidades", global: true },
  { id: 2, nome: "Lazer", tipo: "desejo", rotulo_tipo: "Desejos", global: true },
  { id: 3, nome: "Transporte", tipo: "necessidade", rotulo_tipo: "Necessidades", global: true },
];

const item = (sobrescreve = {}) => ({
  id: 10,
  categoria_id: 1,
  categoria: "Alimentação",
  tipo: "necessidade",
  limite: 800,
  gasto: 600,
  restante: 200,
  percentual: 75,
  status: "normal",
  recorrente: true,
  ...sobrescreve,
});

function resposta({ itens, resumo = {} } = {}) {
  const lista = itens ?? [
    item({ id: 11, categoria_id: 2, categoria: "Lazer", limite: 300, gasto: 350, restante: -50, percentual: 116.7, status: "estourado", recorrente: false }),
    item(),
  ];

  return {
    data: {
      data: lista,
      resumo: {
        competencia: "2026-09",
        competencia_rotulo: "setembro de 2026",
        quantidade: lista.length,
        limite: 1100,
        gasto: 950,
        restante: 150,
        percentual: 86.4,
        normais: 1,
        atencao: 0,
        estourados: 1,
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
            gastos: [], categorias: CATEGORIAS,
            carregarGastos: vi.fn(), carregarCategorias: vi.fn(),
            deletarGasto: vi.fn(), atualizarGasto: vi.fn(),
          }}
        >
          <LancamentosProvider>
            <OrcamentoPage />
          </LancamentosProvider>
        </GastosContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

/**
 * Espera a LISTA, nao o titulo do Card.
 *
 * "Limites por categoria" e o titulo do cartao e ja esta na tela durante o
 * carregamento, com o esqueleto dentro. Esperar por ele deixa a assercao correr
 * antes das linhas chegarem — flake que apareceu de verdade na suite de Metas.
 */
async function aguardarLista() {
  await waitFor(() =>
    expect(document.querySelector(".cf-orcamento")).toBeInTheDocument()
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(resposta());
});

describe("Orçamento — carregamento e erro", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { container } = montar();

    expect(container.querySelector(".cf-orcamentos__carregando")).toBeInTheDocument();
  });

  it("mostra erro amigável e permite tentar de novo", async () => {
    api.get.mockRejectedValue({
      response: { status: 500, data: { message: "SQLSTATE[42S02]" }, headers: {} },
    });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar seus orçamentos");
    expect(alerta.textContent).not.toMatch(/SQLSTATE|vendor|exception/i);

    api.get.mockResolvedValue(resposta());
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Limites por categoria")).toBeInTheDocument();
  });
});

describe("Orçamento — listagem", () => {
  it("confronta limite com o gasto de cada categoria", async () => {
    const { container } = montar();

    await aguardarLista();

    const lista = container.querySelector(".cf-orcamentos");
    expect(within(lista).getByText("Alimentação")).toBeInTheDocument();
    expect(within(lista).getByText("de R$ 800,00")).toBeInTheDocument();
    expect(within(lista).getByText("Ainda pode gastar R$ 200,00")).toBeInTheDocument();
  });

  it("destaca a categoria estourada com o valor excedente", async () => {
    montar();

    await aguardarLista();

    expect(screen.getByText("Estourado")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00 acima do limite")).toBeInTheDocument();
  });

  it("resume total orçado, gasto e disponível", async () => {
    montar();

    await aguardarLista();

    expect(screen.getByText("R$ 1.100,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 950,00")).toBeInTheDocument();
    expect(screen.getByText("1 categoria estourada")).toBeInTheDocument();
  });

  /** Saber se o limite vale sempre ou só neste mês muda a leitura da linha. */
  it("distingue limite recorrente de exceção do mês", async () => {
    const { container } = montar();

    await aguardarLista();

    const vigencias = [...container.querySelectorAll(".cf-orcamento__vigencia")]
      .map((e) => e.textContent.trim());

    expect(vigencias).toContain("todo mês");
    expect(vigencias).toContain("só neste mês");
  });

  /** A barra satura em 100%, mas o excesso continua no texto. */
  it("não deixa a barra passar de 100%", async () => {
    const { container } = montar();

    await aguardarLista();

    const barras = [...container.querySelectorAll(".cf-progresso__preenchimento")];
    for (const barra of barras) {
      const largura = Number.parseFloat(barra.style.width);
      expect(largura).toBeLessThanOrEqual(100);
    }
  });
});

describe("Orçamento — estado vazio", () => {
  it("orienta quem ainda não definiu nenhum limite", async () => {
    api.get.mockResolvedValue(
      resposta({
        itens: [],
        resumo: { quantidade: 0, limite: 0, gasto: 0, restante: 0, percentual: 0, normais: 0, atencao: 0, estourados: 0 },
      })
    );
    montar();

    expect(
      await screen.findByText("Você ainda não definiu nenhum orçamento")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Definir primeiro orçamento" })).toBeInTheDocument();
    // Nada de indicadores zerados antes de existir orçamento.
    expect(screen.queryByText("Total orçado")).not.toBeInTheDocument();
  });
});

describe("Orçamento — definir e editar", () => {
  it("define um limite recorrente", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 12 } } });
    montar();

    await aguardarLista();
    await userEvent.click(screen.getByRole("button", { name: /Novo orçamento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(modal).getByLabelText(/Categoria/), "3");
    await userEvent.type(within(modal).getByLabelText(/Limite mensal/), "400");
    await userEvent.click(within(modal).getByRole("button", { name: "Definir limite" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/orcamentos", {
        categoria_id: 3,
        valor_limite: 400,
        competencia: null,
      })
    );
  });

  /** Exceção de um mês não mexe no limite de sempre. */
  it("define um limite só para a competência escolhida", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 12 } } });
    montar();

    await aguardarLista();
    await userEvent.click(screen.getByRole("button", { name: /Novo orçamento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(modal).getByLabelText(/Categoria/), "3");
    await userEvent.type(within(modal).getByLabelText(/Limite mensal/), "1500");
    await userEvent.selectOptions(within(modal).getByLabelText(/Vigência/), "mes");
    await userEvent.click(within(modal).getByRole("button", { name: "Definir limite" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/orcamentos",
        expect.objectContaining({ valor_limite: 1500, competencia: expect.stringMatching(/^\d{4}-\d{2}$/) })
      )
    );
  });

  /**
   * Todas as categorias continuam disponíveis: filtrá-las impediria criar o
   * limite de todo mês para uma categoria que só tem a exceção deste mês. Quem
   * avisa sobre substituição é o próprio formulário.
   */
  it("avisa quando a combinação escolhida já tem limite", async () => {
    montar();

    await aguardarLista();
    await userEvent.click(screen.getByRole("button", { name: /Novo orçamento/ }));

    const modal = await screen.findByRole("dialog");
    const opcoes = [...within(modal).getByLabelText(/Categoria/).options].map((o) => o.textContent);
    expect(opcoes).toContain("Transporte");
    expect(opcoes).toContain("Alimentação");

    // Alimentação já tem limite recorrente, que é a vigência padrão do form.
    await userEvent.selectOptions(within(modal).getByLabelText(/Categoria/), "1");
    await userEvent.type(within(modal).getByLabelText(/Limite mensal/), "900");

    expect(within(modal).getByText(/já tem esse tipo de limite/)).toBeInTheDocument();
    expect(within(modal).getByText(/R\$ 800,00, será substituído/)).toBeInTheDocument();
  });

  it("abre a edição preenchida e trava a categoria", async () => {
    montar();

    await aguardarLista();
    await userEvent.click(screen.getByRole("button", { name: "Editar orçamento de Alimentação" }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Editar orçamento" })).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Limite mensal/)).toHaveValue(800);
    expect(within(modal).getByLabelText(/Categoria/)).toBeDisabled();
  });

  it("mostra o erro de validação no campo que o originou", async () => {
    api.post.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { valor_limite: ["O limite deve ser maior que zero."] } },
        headers: {},
      },
    });
    montar();

    await aguardarLista();
    await userEvent.click(screen.getByRole("button", { name: /Novo orçamento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(modal).getByLabelText(/Categoria/), "3");
    await userEvent.type(within(modal).getByLabelText(/Limite mensal/), "10");
    await userEvent.click(within(modal).getByRole("button", { name: "Definir limite" }));

    const erro = await within(modal).findByRole("alert");
    expect(erro).toHaveTextContent("O limite deve ser maior que zero.");
    expect(within(modal).getByLabelText(/Limite mensal/)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Orçamento — exclusão", () => {
  it("exclui somente após confirmação e explica o impacto", async () => {
    api.delete.mockResolvedValue({ data: { message: "ok" } });
    montar();

    await aguardarLista();
    await userEvent.click(screen.getByRole("button", { name: "Excluir orçamento de Alimentação" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/sai do cálculo de cumprimento de orçamentos/);
    expect(modal).toHaveTextContent(/Os lançamentos não são afetados/);
    expect(api.delete).not.toHaveBeenCalled();

    await userEvent.click(within(modal).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/orcamentos/10"));
  });

  it("cancelar não exclui nada", async () => {
    montar();

    await aguardarLista();
    await userEvent.click(screen.getByRole("button", { name: "Excluir orçamento de Lazer" }));

    const modal = await screen.findByRole("dialog");
    await userEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));

    expect(api.delete).not.toHaveBeenCalled();
  });
});

describe("Orçamento — período e consistência", () => {
  it("refaz a busca ao trocar de competência", async () => {
    montar();

    await aguardarLista();

    await userEvent.selectOptions(screen.getByLabelText("Período exibido"), screen.getByLabelText("Período exibido").options[0].value);

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/orcamentos", expect.any(Object)));
  });

  it("não renderiza NaN, Infinity nem undefined", async () => {
    const { container } = montar();

    await aguardarLista();
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
  });

  it("cada ação de linha tem nome acessível próprio", async () => {
    montar();

    await aguardarLista();

    expect(screen.getByRole("button", { name: "Editar orçamento de Alimentação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir orçamento de Lazer" })).toBeInTheDocument();
  });
});
