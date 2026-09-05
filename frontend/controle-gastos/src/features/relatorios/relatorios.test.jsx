import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { GastosContext } from "../../Context/gastosContext";
import LancamentosProvider from "../lancamentos/LancamentosProvider";
import RelatoriosPage from "./RelatoriosPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mes = (sobrescreve = {}) => ({
  competencia: "2026-06",
  rotulo: "junho de 2026",
  rotulo_curto: "jun/26",
  renda: 4000,
  gastos: 1500,
  saldo: 2500,
  taxa_economia: 62.5,
  tem_dados: true,
  necessidade: 1000,
  desejo: 500,
  poupanca: 0,
  ...sobrescreve,
});

function resposta(sobrescreve = {}) {
  const evolucao = sobrescreve.evolucao ?? [
    mes(),
    mes({
      competencia: "2026-07", rotulo: "julho de 2026", rotulo_curto: "jul/26",
      gastos: 2000, saldo: 2000, taxa_economia: 50,
      necessidade: 1200, desejo: 0, poupanca: 800,
    }),
    mes({
      competencia: "2026-08", rotulo: "agosto de 2026", rotulo_curto: "ago/26",
      gastos: 1200, saldo: 2800, taxa_economia: 70,
      necessidade: 900, desejo: 300, poupanca: 0,
    }),
  ];

  return {
    data: {
      data: {
        periodo: {
          de: "2026-06", ate: "2026-08",
          de_rotulo: "junho de 2026", ate_rotulo: "agosto de 2026",
          meses: 3, ajustado: false,
        },
        competencias_disponiveis: ["2026-08", "2026-07", "2026-06"],
        tem_dados: true,
        totais: {
          renda: 12000, gastos: 4700, saldo: 7300,
          meses: 3, meses_com_renda: 3, meses_com_gastos: 3,
          media_renda: 4000, media_gastos: 1566.67, media_saldo: 2433.33,
          taxa_economia: 60.8,
        },
        evolucao,
        por_categoria: [
          {
            categoria_id: 1, categoria: "Alimentação", tipo: "necessidade",
            rotulo_tipo: "Necessidades", total: 3100, lancamentos: 3,
            percentual: 66, media_mensal: 1033.33,
          },
          {
            categoria_id: 2, categoria: "Lazer", tipo: "desejo",
            rotulo_tipo: "Desejos", total: 800, lancamentos: 2,
            percentual: 17, media_mensal: 266.67,
          },
        ],
        por_tipo: [
          { tipo: "necessidade", rotulo: "Necessidades", percentual_regra: 0.5, total: 3100, alvo: 6000, diferenca: 2900, media_mensal: 1033.33, percentual: 66, percentual_alvo: 51.7, percentual_renda: 25.8 },
          { tipo: "desejo", rotulo: "Desejos", percentual_regra: 0.3, total: 800, alvo: 3600, diferenca: 2800, media_mensal: 266.67, percentual: 17, percentual_alvo: 22.2, percentual_renda: 6.7 },
          { tipo: "poupanca", rotulo: "Poupança", percentual_regra: 0.2, total: 800, alvo: 2400, diferenca: 1600, media_mensal: 266.67, percentual: 17, percentual_alvo: 33.3, percentual_renda: 6.7 },
        ],
        destaques: {
          mes_maior_gasto: { competencia: "2026-07", rotulo: "julho de 2026", renda: 4000, gastos: 2000, saldo: 2000 },
          mes_menor_gasto: { competencia: "2026-08", rotulo: "agosto de 2026", renda: 4000, gastos: 1200, saldo: 2800 },
          mes_melhor_saldo: { competencia: "2026-08", rotulo: "agosto de 2026", renda: 4000, gastos: 1200, saldo: 2800 },
          categoria_lider: { categoria_id: 1, categoria: "Alimentação", tipo: "necessidade", rotulo_tipo: "Necessidades", total: 3100, lancamentos: 3, percentual: 66, media_mensal: 1033.33 },
          maior_lancamento: { id: 9, descricao: "Supermercado", valor: 1200, data: "2026-07-10", categoria: "Alimentação" },
        },
        ...sobrescreve,
      },
    },
  };
}

function montar(rota = "/relatorios") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <GastosContext.Provider
          value={{
            gastos: [], categorias: [],
            carregarGastos: vi.fn(), carregarCategorias: vi.fn(),
            deletarGasto: vi.fn(), atualizarGasto: vi.fn(),
          }}
        >
          <LancamentosProvider>
            <RelatoriosPage />
          </LancamentosProvider>
        </GastosContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(resposta());
});

describe("Relatórios — carregamento e erro", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    api.get.mockReturnValue(new Promise(() => {}));
    montar();

    expect(screen.getByText("Carregando seu relatório…")).toBeInTheDocument();
  });

  it("mostra erro amigável, sem detalhe técnico, e permite tentar de novo", async () => {
    api.get.mockRejectedValue({
      response: { status: 500, data: { message: "SQLSTATE[42S02] near GROUP BY" }, headers: {} },
    });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar seu relatório");
    expect(alerta.textContent).not.toMatch(/SQLSTATE|GROUP BY|vendor|exception/i);

    api.get.mockResolvedValue(resposta());
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Evolução mensal")).toBeInTheDocument();
  });
});

describe("Relatórios — números do período", () => {
  it("soma renda, gastos, saldo e taxa de economia do intervalo", async () => {
    montar();

    await screen.findByText("Evolução mensal");

    expect(screen.getByText("R$ 12.000,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 4.700,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 7.300,00")).toBeInTheDocument();
    expect(screen.getByText("60,8%")).toBeInTheDocument();
    expect(screen.getByText("R$ 4.000,00/mês em média")).toBeInTheDocument();
  });

  it("descreve o intervalo no cabeçalho", async () => {
    montar();

    await screen.findByText("Evolução mensal");

    expect(
      screen.getByText("De junho de 2026 a agosto de 2026")
    ).toBeInTheDocument();
  });

  it("lista o mês a mês em detalhe", async () => {
    montar();

    await screen.findByText("Mês a mês");

    const tabela = screen.getByRole("table");
    expect(within(tabela).getByText("julho de 2026")).toBeInTheDocument();
    expect(within(tabela).getByText("50,0%")).toBeInTheDocument();
  });

  it("mostra os destaques do período", async () => {
    montar();

    await screen.findByText("Destaques do período");

    expect(screen.getByText("Mês de maior gasto")).toBeInTheDocument();
    expect(screen.getByText("Maior lançamento")).toBeInTheDocument();
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
  });

  it("ordena as categorias da mais consumida para a menos", async () => {
    const { container } = montar();

    await screen.findByText("Onde você gastou");

    const nomes = [...container.querySelectorAll(".cf-ranking__nome")].map(
      (e) => e.textContent
    );
    expect(nomes).toEqual(["Alimentação", "Lazer"]);
    expect(screen.getByText("R$ 1.033,33/mês")).toBeInTheDocument();
  });
});

describe("Relatórios — ausência de base", () => {
  it("explica o período vazio em vez de mostrar uma parede de zeros", async () => {
    api.get.mockResolvedValue(
      resposta({
        tem_dados: false,
        evolucao: [mes({ renda: 0, gastos: 0, saldo: 0, taxa_economia: 0, tem_dados: false, necessidade: 0, desejo: 0, poupanca: 0 })],
        totais: {
          renda: 0, gastos: 0, saldo: 0, meses: 1, meses_com_renda: 0,
          meses_com_gastos: 0, media_renda: 0, media_gastos: 0, media_saldo: 0,
          taxa_economia: 0,
        },
        por_categoria: [],
      })
    );
    montar();

    expect(await screen.findByText("Nenhum dado neste período")).toBeInTheDocument();
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /CSV/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /PDF/ })).toBeDisabled();
  });

  /** Sem renda não há alvo da regra: mostrar "0% de R$ 0,00" pareceria diagnóstico. */
  it("sem renda no intervalo, não inventa os limites da regra", async () => {
    api.get.mockResolvedValue(
      resposta({
        totais: {
          renda: 0, gastos: 800, saldo: -800, meses: 1, meses_com_renda: 0,
          meses_com_gastos: 1, media_renda: 0, media_gastos: 800,
          media_saldo: -800, taxa_economia: 0,
        },
        por_tipo: [
          { tipo: "necessidade", rotulo: "Necessidades", percentual_regra: 0.5, total: 800, alvo: 0, diferenca: -800, media_mensal: 800, percentual: 100, percentual_alvo: 0, percentual_renda: 0 },
          { tipo: "desejo", rotulo: "Desejos", percentual_regra: 0.3, total: 0, alvo: 0, diferenca: 0, media_mensal: 0, percentual: 0, percentual_alvo: 0, percentual_renda: 0 },
          { tipo: "poupanca", rotulo: "Poupança", percentual_regra: 0.2, total: 0, alvo: 0, diferenca: 0, media_mensal: 0, percentual: 0, percentual_alvo: 0, percentual_renda: 0 },
        ],
      })
    );
    montar();

    await screen.findByText("Composição 50/30/20");

    expect(
      screen.getByText(/Sem renda registrada no intervalo não há como calcular/)
    ).toBeInTheDocument();
    // Taxa de economia sem base vira travessão, não 0,0%.
    expect(screen.getByText("Sem renda registrada no intervalo")).toBeInTheDocument();
  });

  it("marca com travessão os meses sem dado na tabela", async () => {
    api.get.mockResolvedValue(
      resposta({
        evolucao: [
          mes(),
          mes({
            competencia: "2026-07", rotulo: "julho de 2026", rotulo_curto: "jul/26",
            renda: 0, gastos: 0, saldo: 0, taxa_economia: 0, tem_dados: false,
            necessidade: 0, desejo: 0, poupanca: 0,
          }),
        ],
      })
    );
    const { container } = montar();

    await screen.findByText("Mês a mês");

    expect(container.querySelectorAll(".cf-tabela__vazio").length).toBeGreaterThan(0);
  });

  /** Nenhum NaN, Infinity ou undefined pode chegar à tela. */
  it("não renderiza NaN, Infinity nem undefined", async () => {
    const { container } = montar();

    await screen.findByText("Evolução mensal");

    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined|null/);
  });
});

describe("Relatórios — intervalo", () => {
  it("lê o intervalo da URL", async () => {
    montar("/relatorios?de=2026-06&ate=2026-08");

    await screen.findByText("Evolução mensal");

    expect(api.get).toHaveBeenCalledWith("/relatorios", {
      params: { de: "2026-06", ate: "2026-08" },
    });
  });

  it("troca o período e recarrega", async () => {
    montar();

    await screen.findByText("Evolução mensal");
    await userEvent.selectOptions(screen.getByLabelText("Período inicial"), "2026-07");

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith("/relatorios", {
        params: { de: "2026-07", ate: "2026-08" },
      })
    );
  });

  /** Fim antes do início não é oferecido: melhor não permitir que corrigir depois. */
  it("não oferece um fim anterior ao início", async () => {
    montar();

    await screen.findByText("Evolução mensal");

    const fim = screen.getByLabelText("Período final");
    const opcoes = [...fim.querySelectorAll("option")].map((o) => o.value);

    expect(opcoes).toEqual(["2026-06", "2026-07", "2026-08"]);

    const inicio = screen.getByLabelText("Período inicial");
    const opcoesInicio = [...inicio.querySelectorAll("option")].map((o) => o.value);
    expect(opcoesInicio.every((o) => o <= "2026-08")).toBe(true);
  });

  it("avisa quando o período foi ancorado no mais recente com dados", async () => {
    api.get.mockResolvedValue(
      resposta({
        periodo: {
          de: "2025-12", ate: "2026-01",
          de_rotulo: "dezembro de 2025", ate_rotulo: "janeiro de 2026",
          meses: 2, ajustado: true,
        },
      })
    );
    montar();

    expect(
      await screen.findByText("Mostrando até janeiro de 2026")
    ).toBeInTheDocument();
  });
});

/**
 * Regressao da Fase I: um intervalo fora dos meses com registro (link antigo ou
 * URL digitada) esvaziava o seletor "ate" e deixava o usuario sem saida.
 */
describe("Relatórios — intervalo fora das competências com registro", () => {
  it("mantém o valor selecionado como opção nos dois seletores", async () => {
    api.get.mockResolvedValue(
      resposta({
        periodo: {
          de: "2027-01", ate: "2027-03",
          de_rotulo: "janeiro de 2027", ate_rotulo: "março de 2027",
          meses: 3, ajustado: false,
        },
        tem_dados: false,
        por_categoria: [],
      })
    );
    montar("/relatorios?de=2027-01&ate=2027-03");

    await screen.findByText("Nenhum dado neste período");

    const inicio = screen.getByLabelText("Período inicial");
    const fim = screen.getByLabelText("Período final");

    expect(fim.querySelectorAll("option").length).toBeGreaterThan(0);
    expect(fim.value).toBe("2027-03");
    expect(inicio.value).toBe("2027-01");

    // O caminho de volta continua aberto pelo "de".
    const opcoesInicio = [...inicio.querySelectorAll("option")].map((o) => o.value);
    expect(opcoesInicio).toContain("2026-06");
    expect(opcoesInicio).toContain("2027-01");
  });
});

describe("Relatórios — exportação", () => {
  it("gera o CSV do mês a mês com total do período", async () => {
    const criado = [];
    const original = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const elemento = original(tag);
      if (tag === "a") {
        elemento.click = vi.fn();
        criado.push(elemento);
      }
      return elemento;
    });

    // O Blob do jsdom não implementa `.text()`; guardamos as partes na criação.
    const partes = [];
    const BlobReal = globalThis.Blob;
    vi.stubGlobal(
      "Blob",
      class extends BlobReal {
        constructor(pedacos, opcoes) {
          super(pedacos, opcoes);
          partes.push(pedacos.join(""));
        }
      }
    );
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:teste"),
      revokeObjectURL: vi.fn(),
    });

    montar();
    await screen.findByText("Evolução mensal");
    await userEvent.click(screen.getByRole("button", { name: /CSV/ }));

    expect(criado).toHaveLength(1);
    expect(criado[0].download).toBe("controle-financeiro-2026-06_a_2026-08.csv");
    expect(criado[0].click).toHaveBeenCalled();

    const conteudo = partes[0];
    // Separador ponto e vírgula e decimal com vírgula: é o que o Excel pt-BR lê.
    expect(conteudo).toContain("Competência;Mês;Renda");
    expect(conteudo).toContain("2026-06;junho de 2026;4000,00");
    expect(conteudo).toContain("Total do período;12000,00;4700,00;7300,00");

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
