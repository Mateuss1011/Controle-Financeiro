import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { GastosContext } from "../../Context/gastosContext";
import LancamentosProvider from "./LancamentosProvider";
import LancamentosPage from "./LancamentosPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const CATEGORIAS = [
  { id: 1, nome: "Alimentação", tipo: "necessidade", rotulo_tipo: "Necessidades", global: true },
  { id: 2, nome: "Lazer", tipo: "desejo", rotulo_tipo: "Desejos", global: true },
];

const gasto = (id, sobrescreve = {}) => ({
  id,
  descricao: `Lançamento ${id}`,
  valor: 100,
  data_lancamento: "2026-09-10",
  categoria: CATEGORIAS[0],
  criado_em: null,
  ...sobrescreve,
});

function respostaLista({ dados = [gasto(1), gasto(2)], total = 200, meta = {} } = {}) {
  return {
    data: {
      data: dados,
      meta: {
        current_page: 1,
        last_page: 1,
        from: dados.length ? 1 : null,
        to: dados.length,
        total: dados.length,
        per_page: 20,
        ...meta,
      },
      resumo: { total },
    },
  };
}

function montar(rota = "/lancamentos", categorias = CATEGORIAS) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <GastosContext.Provider
          value={{
            gastos: [],
            categorias,
            carregarGastos: vi.fn(),
            carregarCategorias: vi.fn(),
            deletarGasto: vi.fn(),
            atualizarGasto: vi.fn(),
          }}
        >
          <LancamentosProvider>
            <LancamentosPage />
          </LancamentosProvider>
        </GastosContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const ultimosParams = () => api.get.mock.calls.at(-1)[1].params;

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(respostaLista());
});

describe("Lançamentos — listagem", () => {
  it("lista os lançamentos do usuário", async () => {
    montar();

    expect(await screen.findByText("Lançamento 1")).toBeInTheDocument();
    expect(screen.getByText("Lançamento 2")).toBeInTheDocument();
  });


  /**
   * Regressão: a limpeza do efeito abortava a requisição, e com o duplo disparo
   * de efeitos do StrictMode isso às vezes matava a única busca em voo — a lista
   * aparecia vazia com 26 lançamentos existindo no servidor.
   */
  it("mostra os dados mesmo quando o efeito é remontado", async () => {
    const { unmount } = montar();
    await screen.findByText("Lançamento 1");
    unmount();

    montar();
    expect(await screen.findByText("Lançamento 1")).toBeInTheDocument();
    expect(screen.getByText(/2 lançamentos/)).toBeInTheDocument();
  });

  it("mostra o esqueleto enquanto carrega", () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { container } = montar();

    expect(container.querySelector(".cf-lista__carregando")).toBeInTheDocument();
  });

  it("mostra erro amigável e permite tentar de novo", async () => {
    api.get.mockRejectedValue({
      response: { status: 500, data: { message: "SQLSTATE[HY000]" }, headers: {} },
    });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).not.toMatch(/SQLSTATE|vendor|exception/i);

    api.get.mockResolvedValue(respostaLista());
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Lançamento 1")).toBeInTheDocument();
  });

  /**
   * O filtro existe para responder "quanto gastei com isso". O total tem que
   * ser o do recorte inteiro, não o dos itens visíveis na página.
   */
  it("exibe o total do resultado, e não o da página", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1)], total: 4590.5, meta: { total: 87, last_page: 5, to: 1 } })
    );
    montar();

    expect(await screen.findByText("R$ 4.590,50")).toBeInTheDocument();
    expect(screen.getByText(/87 lançamentos/)).toBeInTheDocument();
  });

  it("agrupa por dia quando a ordenação é por data", async () => {
    api.get.mockResolvedValue(
      respostaLista({
        dados: [
          gasto(1, { data_lancamento: "2026-09-10", valor: 100 }),
          gasto(2, { data_lancamento: "2026-09-10", valor: 50 }),
          gasto(3, { data_lancamento: "2026-09-08", valor: 30 }),
        ],
      })
    );
    const { container } = montar();

    await screen.findByText("Lançamento 1");

    const dias = [...container.querySelectorAll(".cf-lista__dia")];
    expect(dias).toHaveLength(2);
    expect(dias[0]).toHaveTextContent("10/09/2026");
    // Total do dia: 100 + 50.
    expect(dias[0]).toHaveTextContent("R$ 150,00");
  });

  it("não agrupa por dia quando a ordenação é por valor", async () => {
    const { container } = montar("/lancamentos?ordenar_por=valor&direcao=desc");

    await screen.findByText("Lançamento 1");
    expect(container.querySelectorAll(".cf-lista__dia")).toHaveLength(0);
  });
});

describe("Lançamentos — filtros", () => {
  it("filtra por tipo com um toque e reinicia a paginação", async () => {
    montar("/lancamentos?pagina=3");

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Desejos" }));

    await waitFor(() => expect(ultimosParams().tipo).toBe("desejo"));
    expect(ultimosParams().page).toBe("1");
  });

  it("marca o chip ativo para tecnologia assistiva", async () => {
    montar("/lancamentos?tipo=poupanca");

    await screen.findByText("Lançamento 1");

    expect(screen.getByRole("button", { name: "Poupança" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
  });

  it("busca com atraso, sem uma requisição por tecla", async () => {
    montar();
    await screen.findByText("Lançamento 1");

    const chamadasAntes = api.get.mock.calls.length;
    await userEvent.type(screen.getByLabelText("Buscar por descrição"), "mercado");

    // A digitação sozinha não dispara nada.
    expect(api.get.mock.calls.length).toBe(chamadasAntes);

    await waitFor(() => expect(ultimosParams().busca).toBe("mercado"), { timeout: 2000 });
  });

  it("filtra por categoria e por período", async () => {
    montar();
    await screen.findByText("Lançamento 1");

    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "2");
    await waitFor(() => expect(ultimosParams().categoria_id).toBe("2"));

    await userEvent.selectOptions(screen.getByLabelText("Ordenar por"), "valor:desc");
    await waitFor(() => expect(ultimosParams().ordenar_por).toBe("valor"));
  });

  /** Filtro na URL: o botão voltar funciona e o link pode ser guardado. */
  it("lê os filtros da URL na primeira carga", async () => {
    montar("/lancamentos?tipo=desejo&busca=cinema&competencia=2026-08");

    await waitFor(() => {
      const params = ultimosParams();
      expect(params.tipo).toBe("desejo");
      expect(params.busca).toBe("cinema");
      expect(params.competencia).toBe("2026-08");
    });
  });

  it("limpa todos os filtros", async () => {
    montar("/lancamentos?tipo=desejo&busca=cinema");
    await screen.findByText("Lançamento 1");

    await userEvent.click(screen.getByRole("button", { name: /Limpar filtros/ }));

    await waitFor(() => {
      const params = ultimosParams();
      expect(params.tipo).toBeUndefined();
      expect(params.busca).toBeUndefined();
    });
  });

  it("não oferece limpar filtros quando nenhum está aplicado", async () => {
    montar();
    await screen.findByText("Lançamento 1");

    expect(screen.queryByRole("button", { name: /Limpar filtros/ })).not.toBeInTheDocument();
  });
});

describe("Lançamentos — estados vazios", () => {
  it("distingue lista vazia de filtro sem resultado", async () => {
    api.get.mockResolvedValue(respostaLista({ dados: [], total: 0, meta: { total: 0, from: null, to: 0 } }));

    const { unmount } = montar();
    expect(await screen.findByText("Você ainda não possui lançamentos")).toBeInTheDocument();
    unmount();

    const { container } = montar("/lancamentos?busca=xyz");
    expect(await screen.findByText("Nenhum lançamento com esses filtros")).toBeInTheDocument();

    // O estado vazio traz o próprio atalho, além do que já existe na barra de
    // filtros: quem chegou aqui está olhando para o centro da tela.
    const vazio = container.querySelector(".cf-estado");
    expect(within(vazio).getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });
});

describe("Lançamentos — paginação", () => {
  it("navega entre páginas", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1)], meta: { current_page: 2, last_page: 5, from: 21, to: 21, total: 87 } })
    );
    montar("/lancamentos?pagina=2");

    await screen.findByText("Lançamento 1");
    expect(screen.getByText("Exibindo 21–21 de 87")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Próxima/ }));
    await waitFor(() => expect(ultimosParams().page).toBe("3"));
  });

  it("desabilita anterior na primeira página", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1)], meta: { current_page: 1, last_page: 3, total: 50 } })
    );
    montar();

    await screen.findByText("Lançamento 1");
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();
  });

  it("esconde a paginação quando cabe tudo numa página", async () => {
    montar();

    await screen.findByText("Lançamento 1");
    expect(screen.queryByRole("navigation", { name: /Paginação/ })).not.toBeInTheDocument();
  });
});

describe("Lançamentos — criar, editar, duplicar e excluir", () => {
  it("cria um lançamento e recarrega a lista", async () => {
    api.post.mockResolvedValue({ data: { data: gasto(9) } });
    montar();

    await screen.findByText("Lançamento 1");
    const chamadasAntes = api.get.mock.calls.length;

    await userEvent.click(screen.getByRole("button", { name: /Novo lançamento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Descrição/), "Supermercado");
    await userEvent.type(within(modal).getByLabelText(/Valor/), "820.5");
    await userEvent.selectOptions(within(modal).getByLabelText(/Categoria/), "1");
    await userEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/gastos", expect.objectContaining({
        descricao: "Supermercado",
        valor: 820.5,
        categoria_id: 1,
      }))
    );

    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(chamadasAntes));
  });

  it("mostra o erro de validação no campo que o originou", async () => {
    api.post.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { valor: ["O valor deve ser maior que zero."] } },
        headers: {},
      },
    });
    montar();

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: /Novo lançamento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Descrição/), "Teste");
    await userEvent.type(within(modal).getByLabelText(/Valor/), "10");
    await userEvent.selectOptions(within(modal).getByLabelText(/Categoria/), "1");
    await userEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    const erro = await within(modal).findByRole("alert");
    expect(erro).toHaveTextContent("O valor deve ser maior que zero.");
    expect(within(modal).getByLabelText(/Valor/)).toHaveAttribute("aria-invalid", "true");
  });

  it("abre a edição já preenchida e envia um PUT", async () => {
    api.put.mockResolvedValue({ data: { data: gasto(1) } });
    montar();

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Editar Lançamento 1" }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByLabelText(/Descrição/)).toHaveValue("Lançamento 1");
    expect(within(modal).getByLabelText(/Valor/)).toHaveValue(100);

    await userEvent.clear(within(modal).getByLabelText(/Descrição/));
    await userEvent.type(within(modal).getByLabelText(/Descrição/), "Editado");
    await userEvent.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/gastos/1", expect.objectContaining({ descricao: "Editado" }))
    );
  });

  /** Contas que se repetem todo mês não deveriam exigir digitação repetida. */
  it("duplicar preenche os dados e traz a data para hoje", async () => {
    montar();

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Duplicar Lançamento 1" }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Novo lançamento" })).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Descrição/)).toHaveValue("Lançamento 1");
    expect(within(modal).getByLabelText(/Data/)).toHaveValue(
      new Date().toISOString().slice(0, 10)
    );
  });

  it("exclui somente após confirmação", async () => {
    api.delete.mockResolvedValue({ data: { message: "ok" } });
    montar();

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Excluir Lançamento 1" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent("Esta ação não pode ser desfeita");
    expect(api.delete).not.toHaveBeenCalled();

    await userEvent.click(within(modal).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/gastos/1"));
  });

  it("cancelar a exclusão não apaga nada", async () => {
    montar();

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Excluir Lançamento 1" }));

    const modal = await screen.findByRole("dialog");
    await userEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it("mostra a faixa da regra 50/30/20 da categoria escolhida", async () => {
    montar();

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: /Novo lançamento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(modal).getByLabelText(/Categoria/), "2");

    expect(within(modal).getByText(/faixa "Desejo" da regra 50\/30\/20/)).toBeInTheDocument();
  });
});

describe("Lançamentos — consistência", () => {
  it("não renderiza NaN, Infinity nem undefined", async () => {
    const { container } = montar();

    await screen.findByText("Lançamento 1");
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
  });

  it("cada ação de linha tem nome acessível próprio", async () => {
    montar();

    await screen.findByText("Lançamento 1");

    expect(screen.getByRole("button", { name: "Editar Lançamento 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicar Lançamento 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir Lançamento 2" })).toBeInTheDocument();
  });
});

/*
 * Etapa K: a categoria virou uma árvore de dois níveis. O lançamento continua
 * gravando UMA coluna (`categoria_id`), mas a interface passa a decidir entre
 * a mãe e a filha — e a lista precisa dizer de qual mãe a filha veio.
 */
const sub = (id, nome, paiId, tipo) => ({
  id,
  nome,
  tipo,
  rotulo_tipo: tipo,
  global: true,
  categoria_pai_id: paiId,
  subcategoria: true,
});

const HIERARQUIA = [
  {
    id: 1,
    nome: "Alimentação",
    tipo: "necessidade",
    rotulo_tipo: "Necessidades",
    global: true,
    categoria_pai_id: null,
    subcategoria: false,
    subcategorias: [],
  },
  {
    id: 10,
    nome: "Moradia",
    tipo: "necessidade",
    rotulo_tipo: "Necessidades",
    global: true,
    categoria_pai_id: null,
    subcategoria: false,
    subcategorias: [
      sub(11, "Aluguel", 10, "necessidade"),
      sub(12, "Energia elétrica", 10, "necessidade"),
    ],
  },
  {
    id: 20,
    nome: "Entretenimento",
    tipo: "desejo",
    rotulo_tipo: "Desejos",
    global: true,
    categoria_pai_id: null,
    subcategoria: false,
    subcategorias: [sub(21, "Cinema", 20, "desejo")],
  },
];

/** Como o backend devolve a categoria de um gasto que está numa filha. */
const CATEGORIA_ALUGUEL = {
  id: 11,
  nome: "Aluguel",
  tipo: "necessidade",
  rotulo_tipo: "Necessidades",
  global: true,
  categoria_pai_id: 10,
  subcategoria: true,
  categoria_pai: "Moradia",
};

const CATEGORIA_MORADIA = {
  id: 10,
  nome: "Moradia",
  tipo: "necessidade",
  rotulo_tipo: "Necessidades",
  global: true,
  categoria_pai_id: null,
  subcategoria: false,
};

async function abrirNovoLancamento() {
  await screen.findByText("Lançamento 1");
  await userEvent.click(screen.getByRole("button", { name: /Novo lançamento/ }));

  return screen.findByRole("dialog");
}

async function preencherObrigatorios(modal, descricao = "Aluguel de setembro") {
  await userEvent.type(within(modal).getByLabelText(/Descrição/), descricao);
  await userEvent.type(within(modal).getByLabelText(/^Valor/), "900");
}

describe("Lançamentos — categoria e subcategoria", () => {
  it("mostra o caminho da mãe quando o lançamento está numa subcategoria", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1, { categoria: CATEGORIA_ALUGUEL })] })
    );
    montar("/lancamentos", HIERARQUIA);

    expect(await screen.findByText("Moradia › Aluguel")).toBeInTheDocument();
  });

  it("mostra só o nome quando o lançamento está direto na categoria", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1, { categoria: CATEGORIA_MORADIA })] })
    );
    const { container } = montar("/lancamentos", HIERARQUIA);

    await screen.findByText("Lançamento 1");
    expect(container.querySelector(".cf-item__meta")).toHaveTextContent(/^Moradia/);
    expect(screen.queryByText(/›/)).not.toBeInTheDocument();
  });

  it("só oferece o segundo select quando a categoria escolhida tem filhas", async () => {
    montar("/lancamentos", HIERARQUIA);
    const modal = await abrirNovoLancamento();

    // Nada escolhido: nem categoria, nem campo de subcategoria.
    expect(within(modal).queryByLabelText(/^Subcategoria/)).not.toBeInTheDocument();

    await userEvent.selectOptions(within(modal).getByLabelText(/^Categoria/), "1");
    expect(within(modal).queryByLabelText(/^Subcategoria/)).not.toBeInTheDocument();

    await userEvent.selectOptions(within(modal).getByLabelText(/^Categoria/), "10");
    expect(within(modal).getByLabelText(/^Subcategoria/)).toBeInTheDocument();
  });

  it("envia o id da subcategoria quando ela é escolhida", async () => {
    api.post.mockResolvedValue({ data: { data: gasto(9) } });
    montar("/lancamentos", HIERARQUIA);

    const modal = await abrirNovoLancamento();
    await preencherObrigatorios(modal);
    await userEvent.selectOptions(within(modal).getByLabelText(/^Categoria/), "10");
    await userEvent.selectOptions(within(modal).getByLabelText(/^Subcategoria/), "11");
    await userEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/gastos",
        expect.objectContaining({ categoria_id: 11 })
      )
    );
  });

  /** Subcategoria é opcional: "Sem subcategoria" grava o id da mãe. */
  it("envia o id da categoria quando nenhuma subcategoria é escolhida", async () => {
    api.post.mockResolvedValue({ data: { data: gasto(9) } });
    montar("/lancamentos", HIERARQUIA);

    const modal = await abrirNovoLancamento();
    await preencherObrigatorios(modal, "Condomínio");
    await userEvent.selectOptions(within(modal).getByLabelText(/^Categoria/), "10");
    await userEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/gastos",
        expect.objectContaining({ categoria_id: 10 })
      )
    );
  });

  /**
   * Sem isso o formulário guardaria "Aluguel" com "Entretenimento" escolhido, e
   * o backend receberia uma combinação que a tela nunca mostrou.
   */
  it("trocar de categoria limpa a subcategoria escolhida", async () => {
    api.post.mockResolvedValue({ data: { data: gasto(9) } });
    montar("/lancamentos", HIERARQUIA);

    const modal = await abrirNovoLancamento();
    await preencherObrigatorios(modal, "Sessão de cinema");
    await userEvent.selectOptions(within(modal).getByLabelText(/^Categoria/), "10");
    await userEvent.selectOptions(within(modal).getByLabelText(/^Subcategoria/), "11");
    expect(within(modal).getByLabelText(/^Subcategoria/)).toHaveValue("11");

    await userEvent.selectOptions(within(modal).getByLabelText(/^Categoria/), "20");
    expect(within(modal).getByLabelText(/^Subcategoria/)).toHaveValue("");

    await userEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/gastos",
        expect.objectContaining({ categoria_id: 20 })
      )
    );
  });

  it("editar um lançamento de subcategoria preenche os dois selects", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1, { categoria: CATEGORIA_ALUGUEL })] })
    );
    montar("/lancamentos", HIERARQUIA);

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Editar Lançamento 1" }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByLabelText(/^Categoria/)).toHaveValue("10");
    expect(within(modal).getByLabelText(/^Subcategoria/)).toHaveValue("11");
  });

  it("editar um lançamento da categoria mãe deixa a subcategoria vazia", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1, { categoria: CATEGORIA_MORADIA })] })
    );
    montar("/lancamentos", HIERARQUIA);

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Editar Lançamento 1" }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByLabelText(/^Categoria/)).toHaveValue("10");
    expect(within(modal).getByLabelText(/^Subcategoria/)).toHaveValue("");
  });

  it("duplicar preserva a categoria e a subcategoria", async () => {
    api.get.mockResolvedValue(
      respostaLista({ dados: [gasto(1, { categoria: CATEGORIA_ALUGUEL })] })
    );
    api.post.mockResolvedValue({ data: { data: gasto(9) } });
    montar("/lancamentos", HIERARQUIA);

    await screen.findByText("Lançamento 1");
    await userEvent.click(screen.getByRole("button", { name: "Duplicar Lançamento 1" }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Novo lançamento" })).toBeInTheDocument();
    expect(within(modal).getByLabelText(/^Categoria/)).toHaveValue("10");
    expect(within(modal).getByLabelText(/^Subcategoria/)).toHaveValue("11");

    await userEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/gastos",
        expect.objectContaining({ categoria_id: 11 })
      )
    );
  });

  /** A filha herda o tipo da mãe, então a faixa mostrada é a mesma. */
  it("a faixa 50/30/20 continua vindo da categoria mãe", async () => {
    montar("/lancamentos", HIERARQUIA);

    const modal = await abrirNovoLancamento();
    await userEvent.selectOptions(within(modal).getByLabelText(/^Categoria/), "20");
    await userEvent.selectOptions(within(modal).getByLabelText(/^Subcategoria/), "21");

    expect(within(modal).getByText(/faixa "Desejo" da regra 50\/30\/20/)).toBeInTheDocument();
  });

  /**
   * O filtro é por raiz: escolher "Moradia" traz a árvore inteira, e por isso
   * oferecer as filhas no mesmo select seria oferecer duas perguntas diferentes
   * no mesmo lugar.
   */
  it("o filtro de categoria lista apenas as categorias principais", async () => {
    montar("/lancamentos", HIERARQUIA);

    await screen.findByText("Lançamento 1");
    const filtro = screen.getByLabelText("Categoria");
    const opcoes = [...filtro.querySelectorAll("option")].map((o) => o.textContent);

    expect(opcoes).toEqual([
      "Todas as categorias",
      "Alimentação",
      "Moradia",
      "Entretenimento",
    ]);
  });
});
