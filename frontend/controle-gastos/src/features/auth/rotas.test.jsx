import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { AuthContext } from "./authContext";
import RotaProtegida from "./RotaProtegida";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const USUARIO = { id: 1, name: "Maria Silva", email: "maria@exemplo.com" };

/**
 * Uma tela carregada sob demanda que nunca resolve, para segurar a aplicação no
 * estado de espera e permitir observá-lo. Com um `lazy` real o carregamento
 * termina antes da asserção.
 */
const TelaQueDemora = () => {
  throw new Promise(() => {});
};

function montar({ usuario = USUARIO, rota = "/dashboard" } = {}) {
  const contexto = {
    usuario,
    autenticado: Boolean(usuario),
    verificandoSessao: false,
    entrar: vi.fn(),
    cadastrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <AuthContext.Provider value={contexto}>
          <Routes>
            <Route element={<RotaProtegida />}>
              <Route path="/dashboard" element={<TelaQueDemora />} />
            </Route>
            <Route path="/login" element={<p>Tela de login</p>} />
          </Routes>
        </AuthContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { data: [] } });
});

/*
 * As telas autenticadas passaram a ser carregadas sob demanda na fase final.
 * O risco da mudanca e a tela ficar em branco enquanto o codigo chega, ou a
 * navegacao sumir junto — foi por isso que o Suspense ficou DENTRO da casca.
 */
describe("RotaProtegida — espera pelo codigo da tela", () => {
  it("mostra um estado de carregamento, nunca uma tela em branco", async () => {
    montar();

    await waitFor(() =>
      expect(screen.getByText("Carregando…")).toBeInTheDocument()
    );

    // A espera vive numa regiao viva, para ser anunciada — e numa so, sem
    // aninhar duas que dariam o mesmo aviso em dobro.
    const regioes = screen.getAllByRole("status");
    const daEspera = regioes.filter((r) => r.textContent.includes("Carregando…"));
    expect(daEspera).toHaveLength(1);
  });

  /** Envolver a casca inteira apagaria a navegacao a cada clique. */
  it("mantem a navegacao visivel enquanto o codigo chega", async () => {
    montar();

    await waitFor(() => expect(screen.getByText("Carregando…")).toBeInTheDocument());

    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo lançamento/ })).toBeInTheDocument();
  });

  /** O carregamento sob demanda nao pode furar a guarda de autenticacao. */
  it("continua mandando quem nao tem sessao para o login, sem carregar a tela", () => {
    montar({ usuario: null });

    expect(screen.getByText("Tela de login")).toBeInTheDocument();
    expect(screen.queryByText("Carregando…")).not.toBeInTheDocument();
  });
});
