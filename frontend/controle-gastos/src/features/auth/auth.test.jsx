import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import AuthProvider from "./AuthProvider";
import LoginPage from "./LoginPage";
import RotaProtegida from "./RotaProtegida";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const USUARIO = { id: 1, name: "Lucas Almeida", email: "lucas@exemplo.com" };

function montar(rotaInicial = "/login") {
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RotaProtegida />}>
              <Route path="/dashboard" element={<h1>Área protegida</h1>} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  // A área protegida monta os providers financeiros, que buscam categorias,
  // gastos e rendas. O mock responde por rota; /me é definido em cada teste.
  api.get.mockImplementation((rota) =>
    rota === "/me"
      ? Promise.resolve({ data: { data: USUARIO } })
      : Promise.resolve({ data: { data: [] } })
  );
});

describe("LoginPage", () => {
  it("autentica e leva para a área protegida", async () => {
    api.post.mockResolvedValue({ data: { token: "tok-123", user: USUARIO } });

    montar();

    await userEvent.type(screen.getByLabelText("E-mail"), "lucas@exemplo.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senhaforte1");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Área protegida" })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/login", {
      email: "lucas@exemplo.com",
      password: "senhaforte1",
    });
  });

  it("guarda o token para as próximas requisições", async () => {
    api.post.mockResolvedValue({ data: { token: "tok-123", user: USUARIO } });

    montar();
    await userEvent.type(screen.getByLabelText("E-mail"), "lucas@exemplo.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senhaforte1");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(localStorage.getItem("cf.token")).toBe("tok-123"));
  });

  it("mostra a mensagem de credencial inválida sem expor detalhe técnico", async () => {
    api.post.mockRejectedValue({
      response: { status: 401, data: { message: "Credenciais inválidas." }, headers: {} },
    });

    montar();
    await userEvent.type(screen.getByLabelText("E-mail"), "errado@exemplo.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Credenciais inválidas.");
    expect(alerta.textContent).not.toMatch(/exception|vendor|SQLSTATE/i);
  });

  it("limpa a senha após uma tentativa recusada", async () => {
    api.post.mockRejectedValue({
      response: { status: 401, data: { message: "Credenciais inválidas." }, headers: {} },
    });

    montar();
    await userEvent.type(screen.getByLabelText("E-mail"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await screen.findByRole("alert");
    expect(screen.getByLabelText("Senha")).toHaveValue("");
  });

  it("explica o bloqueio por excesso de tentativas", async () => {
    api.post.mockRejectedValue({
      response: { status: 429, data: {}, headers: { "retry-after": "30" } },
    });

    montar();
    await userEvent.type(screen.getByLabelText("E-mail"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/30 segundos/);
  });

  it("avisa quando o servidor está inacessível", async () => {
    api.post.mockRejectedValue({ message: "Network Error" });

    montar();
    await userEvent.type(screen.getByLabelText("E-mail"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/conexão/i);
  });

  it("mantém o botão desabilitado enquanto faltar e-mail ou senha", async () => {
    montar();

    const botao = screen.getByRole("button", { name: "Entrar" });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText("E-mail"), "a@b.com");
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Senha"), "x");
    expect(botao).toBeEnabled();
  });

  it("permite revelar a senha digitada", async () => {
    montar();

    const senha = screen.getByLabelText("Senha");
    expect(senha).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(senha).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(senha).toHaveAttribute("type", "password");
  });
});

describe("RotaProtegida", () => {
  it("manda para o login quem não está autenticado", async () => {
    montar("/dashboard");

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Área protegida" })).not.toBeInTheDocument();
  });

  it("não busca dado financeiro antes de autenticar", async () => {
    montar("/dashboard");

    await screen.findByRole("heading", { name: "Entrar" });

    const rotasChamadas = api.get.mock.calls.map(([rota]) => rota);
    expect(rotasChamadas).not.toContain("/gastos");
    expect(rotasChamadas).not.toContain("/categorias");
    expect(rotasChamadas).not.toContain("/rendas");
  });

  /**
   * Ter token guardado não é o mesmo que estar autenticado: ele expira em 7
   * dias e pode ter sido revogado. Por isso o boot valida contra /me.
   */
  it("valida o token guardado contra /me antes de liberar a área", async () => {
    localStorage.setItem("cf.token", "tok-antigo");

    montar("/dashboard");

    expect(await screen.findByRole("heading", { name: "Área protegida" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/me");
  });

  it("derruba a sessão quando o token guardado não vale mais", async () => {
    localStorage.setItem("cf.token", "tok-expirado");
    api.get.mockImplementation((rota) =>
      rota === "/me"
        ? Promise.reject({ response: { status: 401, data: {}, headers: {} } })
        : Promise.resolve({ data: { data: [] } })
    );

    montar("/dashboard");

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(localStorage.getItem("cf.token")).toBeNull();
  });

  it("devolve o usuário à rota que ele tentou abrir", async () => {
    api.post.mockResolvedValue({ data: { token: "tok-123", user: USUARIO } });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RotaProtegida />}>
                <Route path="/dashboard" element={<h1>Área protegida</h1>} />
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "Entrar" });

    await userEvent.type(screen.getByLabelText("E-mail"), "lucas@exemplo.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senhaforte1");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Área protegida" })).toBeInTheDocument();
  });
});
