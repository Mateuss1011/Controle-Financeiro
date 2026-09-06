import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { AuthContext } from "../auth/authContext";
import { GastosContext } from "../../Context/gastosContext";
import LancamentosProvider from "../lancamentos/LancamentosProvider";
import DashboardPage from "./DashboardPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

// Recharts precisa de dimensões reais; no jsdom o ResponsiveContainer mede 0.
vi.mock("recharts", async () => {
  const real = await vi.importActual("recharts");

  return {
    ...real,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 300, height: 200 }}>{children}</div>
    ),
  };
});

const USUARIO = { id: 1, name: "Lucas Almeida", email: "lucas@exemplo.com" };

/** Resposta completa do endpoint, no formato real da API. */
function respostaDashboard(sobrescreve = {}) {
  return {
    competencia: "2026-09",
    competencia_rotulo: "setembro de 2026",
    competencia_ajustada: false,
    competencias_com_dados: ["2026-09", "2026-08"],
    periodo: {
      inicio: "2026-09-01", fim: "2026-09-30", dias: 30,
      dias_decorridos: 15, dias_restantes: 15,
      encerrado: false, futuro: false, corrente: true,
    },
    primeira_sessao: false,
    tem_dados: true,
    total_lancamentos: 3,
    resumo: {
      renda: 5000, gastos: 3000, saldo: 2000,
      taxa_economia: 40, percentual_renda_gasto: 60,
    },
    comparacao: {
      disponivel: true,
      motivo: null,
      competencia_anterior: "2026-08",
      renda: { anterior: 5000, atual: 5000, variacao_absoluta: 0, variacao_percentual: 0 },
      gastos: { anterior: 4000, atual: 3000, variacao_absoluta: -1000, variacao_percentual: -25 },
      saldo: { anterior: 1000, atual: 2000, variacao_absoluta: 1000, variacao_percentual: 100 },
      taxa_economia: { anterior: 20, atual: 40, variacao_percentual: null, variacao_pontos: 20 },
    },
    saude: {
      suficiente: true,
      pontuacao: 82,
      classificacao: "excelente",
      rotulo: "Excelente",
      resumo: "Suas finanças estão muito bem organizadas neste período.",
      metodologia: "Média ponderada de quatro indicadores.",
      motivo: null,
      indicadores: [
        { chave: "poupanca", rotulo: "Taxa de poupança", peso: 35, valor: 20, referencia: "meta de 20% da renda", explicacao: "", pontos: 36.8, pontos_maximos: 36.8 },
        { chave: "margem", rotulo: "Margem do período", peso: 25, valor: 40, referencia: "meta de 20% da renda", explicacao: "", pontos: 26.3, pontos_maximos: 26.3 },
        { chave: "necessidades", rotulo: "Necessidades dentro de 50%", peso: 20, valor: 40, referencia: "limite de 50% da renda", explicacao: "", pontos: 21.1, pontos_maximos: 21.1 },
        { chave: "desejos", rotulo: "Desejos dentro de 30%", peso: 15, valor: 20, referencia: "limite de 30% da renda", explicacao: "", pontos: 15.8, pontos_maximos: 15.8 },
      ],
    },
    regra: {
      renda: 5000,
      total_gasto: 3000,
      faixas: [
        { tipo: "necessidade", rotulo: "Necessidades", percentual_regra: 0.5, gasto: 2000, limite: 2500, percentual: 80, diferenca: 500, status: "dentro_do_limite" },
        { tipo: "desejo", rotulo: "Desejos", percentual_regra: 0.3, gasto: 1800, limite: 1500, percentual: 120, diferenca: -300, status: "acima_do_limite" },
        { tipo: "poupanca", rotulo: "Poupança", percentual_regra: 0.2, gasto: 1000, limite: 1000, percentual: 100, diferenca: 0, status: "meta_atingida" },
      ],
    },
    capacidade: {
      disponivel: true, motivo: null, mensagem: null,
      valor_disponivel: 1400, reservado_poupanca: 0,
      dias_restantes: 15, por_dia: 93.33,
      ressalva: "Estimativa calculada a partir dos dados que você registrou. Não é recomendação financeira.",
    },
    ritmo: {
      disponivel: true, motivo: null,
      percentual_gasto: 72, percentual_periodo: 50, diferenca: 22,
      status: "acelerado",
      mensagem: "Você já usou 72% da renda, mas só 50% do mês passou.",
    },
    categorias: [
      { categoria_id: 1, categoria: "Alimentação", tipo: "necessidade", total: 2000, percentual: 66.7 },
      { categoria_id: 2, categoria: "Lazer", tipo: "desejo", total: 1000, percentual: 33.3 },
    ],
    ultimos_lancamentos: [
      { id: 7, descricao: "Supermercado", valor: 820.5, data_lancamento: "2026-09-10", categoria: { id: 1, nome: "Alimentação", tipo: "necessidade", rotulo_tipo: "Necessidades", global: true }, criado_em: null },
    ],
    insights: [
      { tipo: "faixa_estourada", titulo: "Desejos acima do limite", mensagem: "Você passou R$ 300,00 do limite recomendado para desejos.", severidade: "critico", contexto: {} },
      { tipo: "meta_poupanca", titulo: "Meta de poupança atingida", mensagem: "Você guardou R$ 1.000,00 neste período.", severidade: "positivo", contexto: {} },
    ],
    ...sobrescreve,
  };
}

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthContext.Provider
          value={{ usuario: USUARIO, autenticado: true, verificandoSessao: false, entrar: vi.fn(), cadastrar: vi.fn(), sair: vi.fn() }}
        >
          <GastosContext.Provider
            value={{ gastos: [], categorias: [], carregarGastos: vi.fn(), carregarCategorias: vi.fn(), deletarGasto: vi.fn(), atualizarGasto: vi.fn() }}
          >
            <LancamentosProvider>
              <DashboardPage />
            </LancamentosProvider>
          </GastosContext.Provider>
        </AuthContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const responder = (dados) => api.get.mockResolvedValue({ data: { data: dados } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Dashboard — carregamento e erro", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    api.get.mockReturnValue(new Promise(() => {}));
    montar();

    expect(screen.getByText("Carregando seu painel…")).toBeInTheDocument();
  });

  it("mostra estado de erro amigável e permite tentar de novo", async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { message: "SQLSTATE[42S02]" }, headers: {} } });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar seu painel");
    expect(alerta.textContent).not.toMatch(/SQLSTATE|exception|vendor/i);

    responder(respostaDashboard());
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText(/Bom dia|Boa tarde|Boa noite/)).toBeInTheDocument();
  });

  it("busca o dashboard num único request", async () => {
    responder(respostaDashboard());
    montar();

    await screen.findByText("Quanto posso gastar?");
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][0]).toBe("/dashboard");
  });
});

describe("Dashboard — conteúdo", () => {
  beforeEach(() => responder(respostaDashboard()));

  it("saúda o usuário e informa o período exibido", async () => {
    montar();

    expect(await screen.findByText(/Lucas/)).toBeInTheDocument();
    expect(screen.getByText("Visão de setembro de 2026")).toBeInTheDocument();
  });

  it("mostra o resumo com valores em reais", async () => {
    montar();

    await screen.findByText("R$ 5.000,00");
    // Gastos aparece no card e também no centro do donut, de propósito.
    expect(screen.getAllByText("R$ 3.000,00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R$ 2.000,00").length).toBeGreaterThan(0);
    expect(screen.getByText("40,0%")).toBeInTheDocument();
  });

  it("compara com o período anterior", async () => {
    const { container } = montar();
    await screen.findByText("R$ 5.000,00");

    const variacoes = [...container.querySelectorAll(".cf-variacao")].map((e) => e.textContent);

    expect(variacoes.some((texto) => texto.includes("25,0% vs. mês anterior"))).toBe(true);
    expect(variacoes.some((texto) => texto.includes("20 p.p. vs. mês anterior"))).toBe(true);
  });

  it("exibe a pontuação de saúde e sua classificação", async () => {
    montar();

    expect(await screen.findByText("82")).toBeInTheDocument();
    expect(screen.getByText("Excelente")).toBeInTheDocument();
  });

  it("revela a metodologia da pontuação sob demanda", async () => {
    montar();

    const alternar = await screen.findByRole("button", { name: /como a pontuação foi calculada/i });
    expect(alternar).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(alternar);

    expect(alternar).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Taxa de poupança")).toBeInTheDocument();
    expect(screen.getByText("Média ponderada de quatro indicadores.")).toBeInTheDocument();
  });

  it("mostra as três faixas da regra com o excesso visível", async () => {
    montar();

    expect(await screen.findByText("Necessidades")).toBeInTheDocument();
    expect(screen.getByText("Acima do limite")).toBeInTheDocument();
    expect(screen.getByText("R$ 300,00 acima do recomendado")).toBeInTheDocument();
    expect(screen.getByText("Meta atingida")).toBeInTheDocument();
  });

  it("responde quanto pode gastar por dia, com a ressalva", async () => {
    montar();

    expect(await screen.findByText("R$ 93,33")).toBeInTheDocument();
    expect(screen.getByText("por dia")).toBeInTheDocument();
    expect(screen.getByText(/15 dias restantes/)).toBeInTheDocument();
    expect(screen.getByText(/Não é recomendação financeira/)).toBeInTheDocument();
  });

  it("alerta sobre o ritmo de gastos", async () => {
    montar();

    expect(await screen.findByText("Ritmo acelerado")).toBeInTheDocument();
    expect(screen.getByText(/72% da renda, mas só 50% do mês passou/)).toBeInTheDocument();
  });

  it("lista os insights ordenados pelo backend", async () => {
    montar();

    expect(await screen.findByText("Desejos acima do limite")).toBeInTheDocument();
    expect(screen.getByText("Meta de poupança atingida")).toBeInTheDocument();
  });

  it("mostra os últimos lançamentos com categoria e tipo", async () => {
    montar();

    expect(await screen.findByText("Supermercado")).toBeInTheDocument();
    expect(screen.getByText("R$ 820,50")).toBeInTheDocument();
    expect(screen.getAllByText("Necessidade").length).toBeGreaterThan(0);
  });

  /** A regra de ouro do produto: nenhum valor inconsistente na tela. */
  it("não renderiza NaN, Infinity nem undefined", async () => {
    const { container } = montar();
    await screen.findByText("Quanto posso gastar?");

    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
  });
});

describe("Dashboard — seleção de período", () => {
  it("refaz a busca ao trocar de competência", async () => {
    responder(respostaDashboard());
    montar();

    await screen.findByText("Visão de setembro de 2026");

    responder(respostaDashboard({ competencia: "2026-08", competencia_rotulo: "agosto de 2026" }));
    await userEvent.selectOptions(screen.getByLabelText("Período exibido"), "2026-08");

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith("/dashboard", {
        params: { competencia: "2026-08" },
      });
    });

    expect(await screen.findByText("Visão de agosto de 2026")).toBeInTheDocument();
  });


  /**
   * Regressão: `tipo` não é único (um período pode estourar necessidades E
   * desejos). Com chave repetida, o React reaproveitava o nó ao trocar de
   * competência e deixava um insight do mês anterior na tela.
   */
  it("substitui todos os insights ao trocar de competência", async () => {
    responder(respostaDashboard({
      insights: [
        { tipo: "faixa_estourada", titulo: "Necessidades acima do limite", mensagem: "Passou R$ 0,50.", severidade: "critico", contexto: {} },
        { tipo: "faixa_estourada", titulo: "Desejos acima do limite", mensagem: "Passou R$ 90,00.", severidade: "critico", contexto: {} },
      ],
    }));
    montar();

    await screen.findByText("Necessidades acima do limite");

    responder(respostaDashboard({
      competencia: "2026-08",
      competencia_rotulo: "agosto de 2026",
      insights: [
        { tipo: "faixa_perto_do_limite", titulo: "Necessidades perto do limite", mensagem: "Restam R$ 100,00.", severidade: "atencao", contexto: {} },
      ],
    }));
    await userEvent.selectOptions(screen.getByLabelText("Período exibido"), "2026-08");

    expect(await screen.findByText("Necessidades perto do limite")).toBeInTheDocument();
    expect(screen.queryByText("Necessidades acima do limite")).not.toBeInTheDocument();
    expect(screen.queryByText("Desejos acima do limite")).not.toBeInTheDocument();
  });

  it("avisa quando o período exibido não é o mês corrente", async () => {
    responder(respostaDashboard({
      competencia: "2025-12",
      competencia_rotulo: "dezembro de 2025",
      competencia_ajustada: true,
    }));
    montar();

    const aviso = await screen.findByText("Mostrando dezembro de 2025");
    expect(aviso).toBeInTheDocument();
    expect(screen.getByText(/período mais recente com lançamentos/)).toBeInTheDocument();
  });
});

describe("Dashboard — estados vazios", () => {
  it("apresenta o roteiro de três passos numa conta nova", async () => {
    responder(respostaDashboard({
      primeira_sessao: true,
      tem_dados: false,
      total_lancamentos: 0,
      resumo: { renda: 0, gastos: 0, saldo: 0, taxa_economia: 0, percentual_renda_gasto: 0 },
    }));
    montar();

    expect(await screen.findByText("Vamos organizar suas finanças")).toBeInTheDocument();
    expect(screen.getByText("Cadastre sua renda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar lançamento/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar renda" })).toBeInTheDocument();

    // Nada de parede de zeros.
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
  });

  it("explica a ausência de renda em vez de fingir um diagnóstico", async () => {
    responder(respostaDashboard({
      resumo: { renda: 0, gastos: 500, saldo: -500, taxa_economia: 0, percentual_renda_gasto: 0 },
      saude: {
        suficiente: false, pontuacao: null, classificacao: null, rotulo: null,
        resumo: "Dados insuficientes para calcular sua saúde financeira.",
        motivo: "Cadastre a renda deste período para calcular sua saúde financeira.",
        indicadores: [], metodologia: null,
      },
      capacidade: {
        disponivel: false, motivo: "sem_renda",
        mensagem: "Cadastre a renda deste período para saber quanto pode gastar por dia.",
        valor_disponivel: null, reservado_poupanca: null, dias_restantes: null, por_dia: null,
        ressalva: "Estimativa calculada a partir dos dados que você registrou. Não é recomendação financeira.",
      },
      ritmo: { disponivel: false, motivo: "sem_renda" },
    }));
    montar();

    expect(await screen.findByText(/ainda não cadastrou uma renda/)).toBeInTheDocument();
    expect(screen.getByText("Dados insuficientes para calcular sua saúde financeira.")).toBeInTheDocument();
    expect(screen.getByText(/Cadastre a renda deste período para saber quanto pode gastar/)).toBeInTheDocument();

    // Nenhuma pontuação inventada.
    expect(screen.queryByText("/100")).not.toBeInTheDocument();
  });

  it("orienta o primeiro lançamento quando há renda mas nenhum gasto", async () => {
    responder(respostaDashboard({
      total_lancamentos: 0,
      resumo: { renda: 5000, gastos: 0, saldo: 5000, taxa_economia: 100, percentual_renda_gasto: 0 },
      categorias: [],
      ultimos_lancamentos: [],
      insights: [],
    }));
    montar();

    expect(
      await screen.findByText("Você ainda não possui lançamentos neste período")
    ).toBeInTheDocument();
    expect(screen.getByText("Nenhum gasto neste período")).toBeInTheDocument();
  });

  it("omite a comparação quando não há período anterior", async () => {
    responder(respostaDashboard({
      comparacao: { disponivel: false, motivo: "sem_periodo_anterior", competencia_anterior: "2026-08" },
    }));
    montar();

    await screen.findByText("R$ 5.000,00");
    expect(screen.queryByText(/vs\. mês anterior/)).not.toBeInTheDocument();
  });
});

describe("Dashboard — acessibilidade", () => {
  beforeEach(() => responder(respostaDashboard()));

  it("usa um único h1 e rotula o seletor de período", async () => {
    montar();

    await screen.findByText("Quanto posso gastar?");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByLabelText("Período exibido")).toBeInTheDocument();
  });

  it("expõe as barras da regra com rótulo legível", async () => {
    montar();

    await screen.findByText("Necessidades");

    const barra = screen.getByRole("progressbar", {
      name: /Necessidades:\sR\$\s2\.000,00\sde\sR\$\s2\.500,00/,
    });
    expect(barra).toHaveAttribute("aria-valuenow", "80");
  });

  it("anuncia os insights numa região viva", async () => {
    const { container } = montar();
    await screen.findByText("Desejos acima do limite");

    const regiao = container.querySelector('[aria-live="polite"]');
    expect(regiao).toBeInTheDocument();
    expect(within(regiao).getByText("Desejos acima do limite")).toBeInTheDocument();
  });
});

/*
 * A reserva que o "posso gastar" desconta pode vir de duas fontes: os 20% da
 * regra 50/30/20 ou o aporte mensal das metas com prazo. Uma meta explicita nao
 * pode encolher a estimativa em silencio — o conflito precisa aparecer.
 */
describe("Dashboard — reserva e metas", () => {
  const capacidadeCom = (reserva) => ({
    disponivel: true, motivo: null, mensagem: null,
    valor_disponivel: 1400, reservado_poupanca: reserva.aplicada,
    dias_restantes: 15, por_dia: 93.33,
    reserva,
    ressalva: "Estimativa calculada a partir da renda, dos gastos e das metas que você registrou. Não é recomendação financeira.",
  });

  it("mostra os dois valores quando as metas pedem mais que a regra", async () => {
    responder(respostaDashboard({
      capacidade: capacidadeCom({
        aplicada: 3000, pela_regra: 1000, pelas_metas: 3000,
        compromisso_metas: 3000, meta_regra: 1000, poupanca_feita: 0,
        metas_prevalecem: true,
        explicacao: "Suas metas com prazo exigem mais do que os 20% da regra 50/30/20. Reservamos o maior dos dois valores, o das metas.",
      }),
    }));
    const { container } = montar();

    await screen.findByText("Quanto posso gastar?");

    const bloco = container.querySelector(".cf-reserva");
    expect(bloco).toBeInTheDocument();
    expect(bloco).toHaveClass("cf-reserva--metas");
    expect(within(bloco).getByText("R$ 3.000,00")).toBeInTheDocument();
    expect(within(bloco).getByText("Suas metas com prazo")).toBeInTheDocument();
    expect(within(bloco).getByText("R$ 1.000,00/mês")).toBeInTheDocument();
    expect(within(bloco).getByText(/Reservamos o maior dos dois valores/)).toBeInTheDocument();
  });

  it("não apresenta conflito quando a regra já cobre as metas", async () => {
    responder(respostaDashboard({
      capacidade: capacidadeCom({
        aplicada: 1000, pela_regra: 1000, pelas_metas: 100,
        compromisso_metas: 100, meta_regra: 1000, poupanca_feita: 0,
        metas_prevalecem: false,
        explicacao: "Os 20% da regra 50/30/20 já cobrem o aporte necessário das suas metas com prazo.",
      }),
    }));
    const { container } = montar();

    await screen.findByText("Quanto posso gastar?");

    const bloco = container.querySelector(".cf-reserva");
    expect(bloco).not.toHaveClass("cf-reserva--metas");
    expect(within(bloco).queryByText("Suas metas com prazo")).not.toBeInTheDocument();
  });

  it("não inventa bloco de reserva quando não há o que reservar", async () => {
    responder(respostaDashboard({
      capacidade: capacidadeCom({
        aplicada: 0, pela_regra: 0, pelas_metas: 0,
        compromisso_metas: 0, meta_regra: 1000, poupanca_feita: 1000,
        metas_prevalecem: false,
        explicacao: "Nada a reservar.",
      }),
    }));
    const { container } = montar();

    await screen.findByText("Quanto posso gastar?");

    expect(container.querySelector(".cf-reserva")).not.toBeInTheDocument();
  });
});

/*
 * Etapa K: o donut soma pela raiz, então a lista abaixo dele precisa dizer de
 * qual raiz cada lançamento veio. Sem isso o cartão mostraria "Energia
 * elétrica" ao lado de uma fatia chamada "Moradia" — o mesmo dinheiro com dois
 * nomes na mesma tela.
 */
describe("Dashboard — categoria e subcategoria", () => {
  it("mostra o caminho da mãe nos últimos lançamentos", async () => {
    responder(
      respostaDashboard({
        ultimos_lancamentos: [
          {
            id: 8,
            descricao: "Conta de luz",
            valor: 150,
            data_lancamento: "2026-09-06",
            categoria: {
              id: 77,
              nome: "Energia elétrica",
              tipo: "necessidade",
              rotulo_tipo: "Necessidades",
              global: true,
              categoria_pai_id: 2,
              subcategoria: true,
              categoria_pai: "Moradia",
            },
            criado_em: null,
          },
        ],
      })
    );
    montar();

    expect(await screen.findByText(/Moradia › Energia elétrica/)).toBeInTheDocument();
  });
});
