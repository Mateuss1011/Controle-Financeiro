import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { GastosContext } from "../../Context/gastosContext";
import LancamentosProvider from "../lancamentos/LancamentosProvider";
import MetasPage from "./MetasPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const meta = (sobrescreve = {}) => ({
  id: 1,
  nome: "Viagem",
  valor_objetivo: 6000,
  valor_atual: 1500,
  restante: 4500,
  percentual: 25,
  prazo: "2026-12-20",
  meses_restantes: 4,
  aporte_mensal: 1125,
  status: "em_andamento",
  concluida_em: null,
  ...sobrescreve,
});

function resposta({ itens, resumo = {} } = {}) {
  const lista = itens ?? [
    meta(),
    meta({
      id: 2,
      nome: "Reserva de emergência",
      valor_objetivo: 10000,
      valor_atual: 0,
      restante: 10000,
      percentual: 0,
      prazo: null,
      meses_restantes: null,
      aporte_mensal: 0,
      status: "sem_prazo",
    }),
  ];

  return {
    data: {
      data: lista,
      resumo: {
        quantidade: lista.length,
        concluidas: 0,
        vencidas: 0,
        sem_prazo: 1,
        total_objetivo: 16000,
        total_acumulado: 1500,
        total_restante: 14500,
        compromisso_mensal: 1125,
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
            <MetasPage />
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

describe("Metas — carregamento e erro", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { container } = montar();

    expect(container.querySelector(".cf-metas__carregando")).toBeInTheDocument();
  });

  it("mostra erro amigável, sem detalhe técnico, e permite tentar de novo", async () => {
    api.get.mockRejectedValue({
      response: { status: 500, data: { message: "SQLSTATE[42S02]" }, headers: {} },
    });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar suas metas");
    expect(alerta.textContent).not.toMatch(/SQLSTATE|vendor|exception/i);

    api.get.mockResolvedValue(resposta());
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Suas metas")).toBeInTheDocument();
  });
});

describe("Metas — listagem", () => {
  it("mostra progresso, quanto falta e o aporte mensal", async () => {
    const { container } = montar();

    await screen.findByText("Suas metas");

    const lista = container.querySelector(".cf-metas");
    expect(within(lista).getByText("Viagem")).toBeInTheDocument();
    expect(within(lista).getByText("de R$ 6.000,00")).toBeInTheDocument();
    expect(within(lista).getByText(/Faltam R\$ 4\.500,00/)).toBeInTheDocument();
    expect(within(lista).getByText(/R\$ 1\.125,00\/mês/)).toBeInTheDocument();
  });

  /** Sem prazo não há urgência a inferir: nada de aporte inventado. */
  it("não exibe aporte mensal para meta sem prazo", async () => {
    const { container } = montar();

    await screen.findByText("Suas metas");

    const itens = [...container.querySelectorAll(".cf-meta")];
    const semPrazo = itens.find((i) => i.textContent.includes("Reserva de emergência"));

    expect(within(semPrazo).getByText("Sem prazo")).toBeInTheDocument();
    expect(semPrazo.textContent).not.toMatch(/\/mês/);
  });

  it("destaca meta com prazo vencido", async () => {
    api.get.mockResolvedValue(
      resposta({
        itens: [meta({ status: "vencida", prazo: "2026-06-30", aporte_mensal: 4500, meses_restantes: 1 })],
      })
    );
    montar();

    await screen.findByText("Suas metas");

    expect(screen.getByText("Prazo vencido")).toBeInTheDocument();
    expect(screen.getByText(/o prazo já passou/)).toBeInTheDocument();
  });

  it("marca meta concluída e esconde a ação de guardar mais", async () => {
    api.get.mockResolvedValue(
      resposta({
        itens: [
          meta({
            valor_atual: 6000, restante: 0, percentual: 100,
            aporte_mensal: 0, status: "concluida", concluida_em: "2026-09-01T10:00:00-03:00",
          }),
        ],
      })
    );
    const { container } = montar();

    await screen.findByText("Suas metas");

    expect(screen.getByText("Concluída")).toBeInTheDocument();
    expect(screen.getByText(/Objetivo alcançado/)).toBeInTheDocument();
    expect(container.querySelector(".cf-meta--concluida")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Registrar valor guardado/ })
    ).not.toBeInTheDocument();
  });

  /** A barra satura em 100%, mesmo se o backend mandar mais. */
  it("não deixa a barra de progresso passar de 100%", async () => {
    api.get.mockResolvedValue(resposta({ itens: [meta({ percentual: 180 })] }));
    const { container } = montar();

    await screen.findByText("Suas metas");

    const barra = container.querySelector(".cf-progresso__preenchimento");
    expect(Number.parseFloat(barra.style.width)).toBeLessThanOrEqual(100);
  });
});

describe("Metas — estado vazio", () => {
  it("orienta quem ainda não tem meta nenhuma", async () => {
    api.get.mockResolvedValue(
      resposta({
        itens: [],
        resumo: {
          quantidade: 0, concluidas: 0, vencidas: 0, sem_prazo: 0,
          total_objetivo: 0, total_acumulado: 0, total_restante: 0, compromisso_mensal: 0,
        },
      })
    );
    montar();

    expect(await screen.findByText("Você ainda não tem metas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar primeira meta" })).toBeInTheDocument();
    // Nada de indicadores zerados antes de existir meta.
    expect(screen.queryByText("Total das metas")).not.toBeInTheDocument();
  });
});

describe("Metas — criar e editar", () => {
  it("cria uma meta com prazo e antecipa o aporte necessário", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 9 } } });
    montar();

    await screen.findByText("Suas metas");
    await userEvent.click(screen.getByRole("button", { name: /Nova meta/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Nome da meta/), "Notebook");
    await userEvent.type(within(modal).getByLabelText(/Quanto quero juntar/), "4000");

    const prazo = new Date();
    prazo.setMonth(prazo.getMonth() + 3);
    const iso = `${prazo.getFullYear()}-${String(prazo.getMonth() + 1).padStart(2, "0")}-10`;
    await userEvent.type(within(modal).getByLabelText(/Prazo/), iso);

    // 4000 em 4 meses (o corrente mais três) = R$ 1.000,00 por mês.
    expect(
      await within(modal).findByText(/Você precisa guardar R\$ 1\.000,00 por mês/)
    ).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole("button", { name: "Criar meta" }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/metas", {
      nome: "Notebook",
      valor_objetivo: 4000,
      valor_atual: 0,
      prazo: iso,
    });
  });

  it("bloqueia o envio quando o guardado passa do objetivo", async () => {
    montar();

    await screen.findByText("Suas metas");
    await userEvent.click(screen.getByRole("button", { name: /Nova meta/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Nome da meta/), "Carro");
    await userEvent.type(within(modal).getByLabelText(/Quanto quero juntar/), "1000");
    await userEvent.type(within(modal).getByLabelText(/Quanto já tenho guardado/), "1500");

    expect(
      within(modal).getByText("Não pode ser maior que o objetivo.")
    ).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "Criar meta" })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("edita uma meta existente", async () => {
    api.put.mockResolvedValue({ data: { data: { id: 1 } } });
    montar();

    await screen.findByText("Suas metas");
    await userEvent.click(screen.getByRole("button", { name: "Editar meta Viagem" }));

    const modal = await screen.findByRole("dialog");
    const nome = within(modal).getByLabelText(/Nome da meta/);
    await userEvent.clear(nome);
    await userEvent.type(nome, "Viagem ao Chile");
    await userEvent.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(api.put).toHaveBeenCalledWith("/metas/1", expect.objectContaining({
      nome: "Viagem ao Chile",
      valor_objetivo: 6000,
    }));
  });
});

describe("Metas — aporte rápido", () => {
  it("soma o valor guardado ao acumulado e mostra o total antes de confirmar", async () => {
    api.put.mockResolvedValue({ data: { data: { id: 1 } } });
    montar();

    await screen.findByText("Suas metas");
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar valor guardado em Viagem" })
    );

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Quanto você guardou agora/), "500");

    expect(
      within(modal).getByText("O total guardado passa a ser R$ 2.000,00")
    ).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/metas/1", { valor_atual: 2000 }));
  });

  /** Um acumulado acima do objetivo não significa nada — o valor é limitado. */
  it("limita o total ao objetivo quando o aporte passa do necessário", async () => {
    api.put.mockResolvedValue({ data: { data: { id: 1 } } });
    montar();

    await screen.findByText("Suas metas");
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar valor guardado em Viagem" })
    );

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByLabelText(/Quanto você guardou agora/), "9000");

    expect(
      within(modal).getByText("O total guardado passa a ser R$ 6.000,00")
    ).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/metas/1", { valor_atual: 6000 }));
  });
});

describe("Metas — exclusão", () => {
  it("pede confirmação e explica o efeito na estimativa de gasto", async () => {
    api.delete.mockResolvedValue({ data: { message: "ok" } });
    montar();

    await screen.findByText("Suas metas");
    await userEvent.click(screen.getByRole("button", { name: "Excluir meta Viagem" }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent("Excluir meta");
    expect(modal).toHaveTextContent(/R\$ 1\.125,00 por mês deixa de ser considerado/);

    await userEvent.click(within(modal).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/metas/1"));
  });
});
