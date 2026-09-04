import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import api from "../services/api";
import { GastosProvider } from "./GastosProvider";
import { useGastos } from "./gastosContext";

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

