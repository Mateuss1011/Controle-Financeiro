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

/*
 * O catálogo chega em árvore de dois níveis, como o endpoint devolve: as
 * principais na raiz, as filhas dentro delas.
 *
 * `total_lancamentos` da mãe é ACUMULADO (inclui as filhas) e é o número que
 * decide a exclusão; `lancamentos_diretos` é o que aponta só para ela.
 */
const CATEGORIAS = [
  {
    id: 1,
    nome: "Alimentação",
    tipo: "necessidade",
    rotulo_tipo: "Necessidades",
    global: true,
    categoria_pai_id: null,
    subcategoria: false,
    total_lancamentos: 6,
    lancamentos_diretos: 4,
    subcategorias: [
      {
        id: 11,
        nome: "Supermercado",
        tipo: "necessidade",
        rotulo_tipo: "Necessidades",
        global: true,
        categoria_pai_id: 1,
        subcategoria: true,
        total_lancamentos: 2,
        lancamentos_diretos: 2,
      },
      {
        id: 12,
        nome: "Feira do bairro",
        tipo: "necessidade",
        rotulo_tipo: "Necessidades",
        global: false,
        categoria_pai_id: 1,
        subcategoria: true,
        total_lancamentos: 0,
        lancamentos_diretos: 0,
      },
    ],
  },
  {
    id: 2,
    nome: "Farmácia",
    tipo: "necessidade",
    rotulo_tipo: "Necessidades",
    global: false,
    categoria_pai_id: null,
    subcategoria: false,
    total_lancamentos: 0,
    lancamentos_diretos: 0,
    subcategorias: [],
  },
  {
    id: 3,
    nome: "Lazer",
    tipo: "desejo",
    rotulo_tipo: "Desejos",
    global: true,
    categoria_pai_id: null,
    subcategoria: false,
    total_lancamentos: 2,
    lancamentos_diretos: 2,
    subcategorias: [],
  },
  {
    id: 4,
    nome: "Cripto",
    tipo: "poupanca",
    rotulo_tipo: "Poupança",
    global: false,
    categoria_pai_id: null,
    subcategoria: false,
    total_lancamentos: 3,
    lancamentos_diretos: 3,
    subcategorias: [],
  },
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

const expandirAlimentacao = () =>
  screen.getByRole("button", { name: /subcategorias de Alimentação/ });

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

  /** Na mãe o número inclui as filhas: é o mesmo que o orçamento dela consome. */
  it("conta os lançamentos da árvore na mãe e os próprios na filha", async () => {
    montar();

    await screen.findByText("Alimentação");

    expect(screen.getByText("6 lançamentos")).toBeInTheDocument();
    await userEvent.click(expandirAlimentacao());

    const lista = document.getElementById("subcategorias-de-1");
    expect(within(lista).getByText("2 lançamentos")).toBeInTheDocument();
    expect(within(lista).getByText("0 lançamentos")).toBeInTheDocument();
  });

  it("usa o singular com um lançamento só", async () => {
    responder([{ ...CATEGORIAS[1], total_lancamentos: 1 }]);
    montar();

    expect(await screen.findByText("1 lançamento")).toBeInTheDocument();
  });

  /** A ausência dos botões precisa ter explicação visível, senão parece bug. */
  it("marca as categorias do sistema e não oferece editar nem excluir", async () => {
    montar();

    await screen.findByText("Alimentação");

    expect(
      screen.queryByRole("button", { name: "Editar categoria Alimentação" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Excluir categoria Alimentação" })
    ).not.toBeInTheDocument();

    // As próprias continuam editáveis.
    expect(
      screen.getByRole("button", { name: "Editar categoria Farmácia" })
    ).toBeInTheDocument();
  });

  /** As duas origens são marcadas: só uma delas marcada deixa a outra ambígua. */
  it("distingue as categorias do sistema das criadas pelo usuário", async () => {
    const { container } = montar();

    await screen.findByText("Alimentação");
    await userEvent.click(expandirAlimentacao());

    const etiquetas = [...container.querySelectorAll(".cf-categoria__padrao")];
    // 4 principais + 2 subcategorias.
    expect(etiquetas).toHaveLength(6);
    expect(etiquetas.filter((e) => e.textContent.includes("do sistema"))).toHaveLength(3);
    expect(etiquetas.filter((e) => e.textContent === "sua")).toHaveLength(3);
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

  it("não renderiza NaN, Infinity nem undefined", async () => {
    const { container } = montar();

    await screen.findByText("Alimentação");
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
  });
});

describe("Categorias — árvore", () => {
  it("mantém as subcategorias recolhidas até que se peça para ver", async () => {
    montar();

    await screen.findByText("Alimentação");

    // No DOM, para que o aria-controls tenha a quem apontar — mas invisíveis.
    expect(screen.getByText("Supermercado")).not.toBeVisible();
    expect(screen.getByText("Feira do bairro")).not.toBeVisible();
  });

  it("expande e recolhe anunciando o estado", async () => {
    montar();

    await screen.findByText("Alimentação");

    const botao = screen.getByRole("button", {
      name: "Expandir subcategorias de Alimentação",
    });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveAttribute("aria-controls", "subcategorias-de-1");
    expect(document.getElementById("subcategorias-de-1")).toBeInTheDocument();

    await userEvent.click(botao);

    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(botao).toHaveAccessibleName("Recolher subcategorias de Alimentação");
    expect(screen.getByText("Supermercado")).toBeVisible();

    await userEvent.click(botao);

    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Supermercado")).not.toBeVisible();
  });

  /** Sem filhas não há o que expandir: o botão não existe. */
  it("não oferece expandir uma categoria sem subcategorias", async () => {
    montar();

    await screen.findByText("Farmácia");

    expect(
      screen.queryByRole("button", { name: /subcategorias de Farmácia/ })
    ).not.toBeInTheDocument();
  });

  it("anuncia quantas subcategorias a categoria tem", async () => {
    montar();

    await screen.findByText("Alimentação");
    expect(screen.getByText("2 subcategorias")).toBeInTheDocument();
  });
});

describe("Categorias — criar e editar", () => {
  it("cria uma categoria principal explicando o efeito do tipo", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 9 } } });
    montar();

    await screen.findByText("Farmácia");
    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Nome/), "Pets");
    await userEvent.selectOptions(within(modal).getByLabelText(/^Tipo/), "desejo");

    expect(within(modal).getByText(/Teto de 30% da renda/)).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole("button", { name: "Criar categoria" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/categorias", {
        nome: "Pets",
        categoria_pai_id: null,
        tipo: "desejo",
      })
    );
  });

  /**
   * Criar já dentro da mãe: o caminho natural é a partir da linha dela, e o
   * select de categoria mãe chega preenchido.
   */
  it("cria uma subcategoria a partir da categoria mãe", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 9 } } });
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(
      screen.getByRole("button", { name: "Nova subcategoria em Alimentação" })
    );

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Nova subcategoria" })).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Categoria mãe/)).toHaveValue("1");

    await userEvent.type(within(modal).getByLabelText(/Nome/), "Padaria");
    await userEvent.click(within(modal).getByRole("button", { name: "Criar categoria" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/categorias", {
        nome: "Padaria",
        categoria_pai_id: 1,
      })
    );
  });

  /**
   * A subcategoria herda a faixa da mãe. Um campo de tipo aqui — mesmo
   * desabilitado — sugeriria uma escolha que não existe, e permitiria imaginar
   * "Alimentação = necessidade" com "Padaria = desejo".
   */
  it("não oferece escolher o tipo de uma subcategoria", async () => {
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(
      screen.getByRole("button", { name: "Nova subcategoria em Alimentação" })
    );

    const modal = await screen.findByRole("dialog");
    expect(within(modal).queryByLabelText(/^Tipo/)).not.toBeInTheDocument();
    expect(within(modal).getByText(/Herda a faixa da categoria mãe: Necessidade/))
      .toBeInTheDocument();
  });

  /** Só principais podem ser mãe — a lista não oferece uma filha. */
  it("só oferece categorias principais como mãe", async () => {
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));

    const modal = await screen.findByRole("dialog");
    const opcoes = [...within(modal).getByLabelText(/Categoria mãe/).querySelectorAll("option")]
      .map((o) => o.textContent);

    expect(opcoes).toEqual([
      "Nenhuma — é uma categoria principal",
      "Alimentação",
      "Farmácia",
      "Lazer",
      "Cripto",
    ]);
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

  it("exclui uma subcategoria sem lançamentos", async () => {
    api.delete.mockResolvedValue({ data: { message: "ok" } });
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(expandirAlimentacao());
    await userEvent.click(
      screen.getByRole("button", { name: "Excluir subcategoria Feira do bairro" })
    );

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Excluir subcategoria" })).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/categorias/12"));
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

  /** A mãe conta os lançamentos das filhas, e o texto diz de onde eles vêm. */
  it("conta os lançamentos das subcategorias ao impedir a exclusão da mãe", async () => {
    const propria = {
      ...CATEGORIAS[0],
      global: false,
      subcategorias: [{ ...CATEGORIAS[0].subcategorias[1], total_lancamentos: 2 }],
    };
    responder([propria]);
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria Alimentação" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/6 lançamentos \(contando os das subcategorias\)/);
    expect(within(modal).getByRole("button", { name: "Excluir" })).toBeDisabled();
  });

  it("impede a exclusão de uma mãe que ainda tem subcategorias", async () => {
    const propria = {
      ...CATEGORIAS[0],
      global: false,
      total_lancamentos: 0,
      lancamentos_diretos: 0,
    };
    responder([propria]);
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria Alimentação" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/2 subcategorias e não pode ser excluída/);
    expect(within(modal).getByRole("button", { name: "Excluir" })).toBeDisabled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  /**
   * Orçamento definido é a única dependência que a tela não enxerga sem uma
   * requisição a mais. Ela chega como 422 e vira aviso, não stack trace.
   */
  it("mostra a recusa do servidor quando o impedimento não é visível na tela", async () => {
    api.delete.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: "Esta categoria tem 1 orçamento definido e não pode ser excluída.",
          motivo: "orcamentos",
        },
        headers: {},
      },
    });
    montar();

    await screen.findByText("Farmácia");
    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria Farmácia" }));

    const modal = await screen.findByRole("dialog");
    await userEvent.click(within(modal).getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText("Esta categoria tem 1 orçamento definido e não pode ser excluída.")
    ).toBeInTheDocument();
  });
});

describe("Categorias — dois níveis, e só dois", () => {
  /**
   * Mover uma categoria que já tem filhas para dentro de outra criaria um
   * terceiro nível. O backend recusa; a tela nem deixa pedir, e diz por quê.
   */
  it("não deixa uma categoria com subcategorias virar subcategoria", async () => {
    responder([{ ...CATEGORIAS[0], global: false }]);
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(screen.getByRole("button", { name: "Editar categoria Alimentação" }));

    const modal = await screen.findByRole("dialog");
    const select = within(modal).getByLabelText(/Categoria mãe/);

    expect(select).toBeDisabled();
    expect(within(modal).getByText(/tem subcategorias, então ela própria não pode virar uma/))
      .toBeInTheDocument();
  });

  it("edita uma subcategoria mantendo a mãe", async () => {
    api.put.mockResolvedValue({ data: { data: { id: 12 } } });
    montar();

    await screen.findByText("Alimentação");
    await userEvent.click(expandirAlimentacao());
    await userEvent.click(
      screen.getByRole("button", { name: "Editar subcategoria Feira do bairro" })
    );

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Editar subcategoria" })).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Categoria mãe/)).toHaveValue("1");

    await userEvent.clear(within(modal).getByLabelText(/Nome/));
    await userEvent.type(within(modal).getByLabelText(/Nome/), "Feira livre");
    await userEvent.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/categorias/12", {
        nome: "Feira livre",
        categoria_pai_id: 1,
      })
    );
  });
});
