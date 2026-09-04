import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import api from "../services/api";
import { GastosProvider } from "./GastosProvider";
import { SalarioProvider } from "./SalarioProvider";
import { useGastos } from "./gastosContext";
import { useSalario } from "./salarioContext";

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function EspiaGastos() {
  const { categorias, gastos } = useGastos();

  return (
    <span data-testid="espia">
      {categorias.length} categorias · {gastos.length} gastos
    </span>
  );
}

function EspiaSalario() {
  const { salario } = useSalario();

  return <span data-testid="espia">{salario}</span>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

/**
 * Regressão: os providers checavam `localStorage.getItem("token")` — a chave
 * antiga, renomeada para "cf.token" quando a sessão foi centralizada. A guarda
 * virou sempre falsa e as categorias nunca eram carregadas, deixando o seletor
 * do formulário de lançamento vazio. Hoje eles só montam dentro da área
 * autenticada, então não existe guarda a errar.
 */
describe("GastosProvider", () => {
  it("carrega categorias e gastos ao montar, sem depender de chave no localStorage", async () => {
    api.get.mockImplementation((rota) =>
      Promise.resolve({
        data: {
          data:
            rota === "/categorias"
              ? [{ id: 1, nome: "Alimentação", tipo: "necessidade" }]
              : [{ id: 9, descricao: "Mercado", valor: 10 }],
        },
      })
    );

    render(
      <GastosProvider>
        <EspiaGastos />
      </GastosProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("espia")).toHaveTextContent("1 categorias · 1 gastos")
    );

    const rotas = api.get.mock.calls.map(([rota]) => rota);
    expect(rotas).toContain("/categorias");
    expect(rotas).toContain("/gastos");
  });
});

describe("SalarioProvider", () => {
  it("carrega a renda mais recente ao montar", async () => {
    api.get.mockResolvedValue({
      data: { data: [{ id: 4, valor: 2086.65, competencia: "2025-12" }] },
    });

    render(
      <SalarioProvider>
        <EspiaSalario />
      </SalarioProvider>
    );

    await waitFor(() => expect(screen.getByTestId("espia")).toHaveTextContent("2086.65"));
    expect(api.get).toHaveBeenCalledWith("/rendas");
  });
});
