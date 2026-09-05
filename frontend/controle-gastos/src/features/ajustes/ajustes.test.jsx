import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import api from "../../services/api";
import { ToastProvider } from "../../components/ui";
import { AuthContext } from "../auth/authContext";
import AjustesPage from "./AjustesPage";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const USUARIO = { id: 1, name: "Maria Silva", email: "maria@exemplo.com" };

function montar(sobrescreve = {}) {
  const valor = {
    usuario: USUARIO,
    autenticado: true,
    verificandoSessao: false,
    entrar: vi.fn(),
    cadastrar: vi.fn(),
    sair: vi.fn().mockResolvedValue(undefined),
    atualizarUsuario: vi.fn(),
    ...sobrescreve,
  };

  return {
    valor,
    ...render(
      <MemoryRouter>
        <ToastProvider>
          <AuthContext.Provider value={valor}>
            <AjustesPage />
          </AuthContext.Provider>
        </ToastProvider>
      </MemoryRouter>
    ),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("Ajustes — perfil", () => {
  it("começa preenchido com os dados da conta e sem nada para salvar", () => {
    montar();

    expect(screen.getByLabelText(/Nome/)).toHaveValue("Maria Silva");
    expect(screen.getByLabelText(/E-mail/)).toHaveValue("maria@exemplo.com");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
    expect(screen.getByText("Nada para salvar.")).toBeInTheDocument();
  });

  it("salva o novo nome e atualiza a sessão em memória", async () => {
    const atualizado = { ...USUARIO, name: "Maria Souza" };
    api.patch.mockResolvedValue({ data: { data: atualizado } });

    const { valor } = montar();

    const nome = screen.getByLabelText(/Nome/);
    await userEvent.clear(nome);
    await userEvent.type(nome, "Maria Souza");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/perfil", {
        name: "Maria Souza",
        email: "maria@exemplo.com",
      })
    );
    // Trocar o nome nao envolve credencial: nada de senha no payload.
    expect(api.patch.mock.calls[0][1]).not.toHaveProperty("senha_atual");

    // Sem isto, a saudação do Dashboard ficaria com o nome antigo.
    expect(valor.atualizarUsuario).toHaveBeenCalledWith(atualizado);
  });

  /** Trocar o e-mail troca o login: precisa estar dito antes de salvar. */
  it("avisa que o e-mail é a credencial quando ele muda", async () => {
    montar();

    expect(screen.queryByText(/o login passa a ser com o novo/)).not.toBeInTheDocument();

    const email = screen.getByLabelText(/E-mail/);
    await userEvent.clear(email);
    await userEvent.type(email, "nova@exemplo.com");

    expect(screen.getByText(/o login passa a ser com o novo/)).toBeInTheDocument();
  });

  it("mostra o erro de validação no campo que o originou", async () => {
    api.patch.mockRejectedValue({
      response: {
        status: 422,
        data: { message: "erro", errors: { email: ["Este e-mail já está em uso."] } },
        headers: {},
      },
    });
    montar();

    const email = screen.getByLabelText(/E-mail/);
    await userEvent.clear(email);
    await userEvent.type(email, "joao@exemplo.com");
    await userEvent.type(screen.getByLabelText(/Confirme sua senha/), "SenhaAtual#2026");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Este e-mail já está em uso.")).toBeInTheDocument();
  });
});

/*
 * O e-mail e a credencial de login. Trocar sem provar identidade e o caminho
 * mais curto entre um computador deixado aberto e o sequestro da conta.
 */
describe("Ajustes — senha para trocar o e-mail", () => {
  const trocarEmail = async (novo = "nova@exemplo.com") => {
    const email = screen.getByLabelText(/E-mail/);
    await userEvent.clear(email);
    await userEvent.type(email, novo);
  };

  it("nao pede senha enquanto o e-mail nao muda", () => {
    montar();

    expect(screen.queryByLabelText(/Confirme sua senha/)).not.toBeInTheDocument();
  });

  it("pede a senha assim que o e-mail muda", async () => {
    montar();
    await trocarEmail();

    expect(screen.getByLabelText(/Confirme sua senha/)).toBeInTheDocument();
  });

  it("bloqueia o envio enquanto a senha nao for preenchida", async () => {
    montar();
    await trocarEmail();

    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("envia a senha junto quando o e-mail muda", async () => {
    api.patch.mockResolvedValue({
      data: { data: { ...USUARIO, email: "nova@exemplo.com" } },
    });
    montar();

    await trocarEmail();
    await userEvent.type(screen.getByLabelText(/Confirme sua senha/), "SenhaAtual#2026");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/perfil", {
        name: "Maria Silva",
        email: "nova@exemplo.com",
        senha_atual: "SenhaAtual#2026",
      })
    );
  });

  it("mostra a recusa do servidor no campo da senha", async () => {
    api.patch.mockRejectedValue({
      response: {
        status: 422,
        data: { message: "erro", errors: { senha_atual: ["A senha atual está incorreta."] } },
        headers: {},
      },
    });
    montar();

    await trocarEmail();
    await userEvent.type(screen.getByLabelText(/Confirme sua senha/), "ChutandoAqui#1");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("A senha atual está incorreta.")).toBeInTheDocument();
    // O campo continua na tela para o usuario tentar de novo.
    expect(screen.getByLabelText(/Confirme sua senha/)).toBeInTheDocument();
  });

  /** Voltar atras no e-mail dispensa a senha de novo. */
  it("esconde o campo quando o e-mail volta ao original", async () => {
    montar();
    await trocarEmail();
    expect(screen.getByLabelText(/Confirme sua senha/)).toBeInTheDocument();

    await trocarEmail("maria@exemplo.com");

    expect(screen.queryByLabelText(/Confirme sua senha/)).not.toBeInTheDocument();
  });
  /** Dois campos de senha na mesma pagina precisam ter nomes distintos. */
  it("nao colide com o campo de senha do cartao de troca de senha", async () => {
    montar();

    const email = screen.getByLabelText(/E-mail/);
    await userEvent.clear(email);
    await userEvent.type(email, "nova@exemplo.com");

    expect(screen.getByLabelText(/Confirme sua senha/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha atual/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirme sua senha/)).not.toBe(
      screen.getByLabelText(/Senha atual/)
    );
  });
});

describe("Ajustes — senha", () => {
  const preencher = async ({ atual, nova, confirmacao }) => {
    // Regex sensível a maiúsculas: "Nova senha" não colide com "Confirme a
    // nova senha".
    await userEvent.type(screen.getByLabelText(/Senha atual/), atual);
    await userEvent.type(screen.getByLabelText(/Nova senha/), nova);
    await userEvent.type(screen.getByLabelText(/Confirme a nova senha/), confirmacao);
  };

  it("troca a senha e informa quantas sessões caíram", async () => {
    api.put.mockResolvedValue({
      data: { message: "Senha alterada com sucesso.", sessoes_encerradas: 2 },
    });
    montar();

    await preencher({
      atual: "SenhaAtual#2026",
      nova: "NovaSenha#2026",
      confirmacao: "NovaSenha#2026",
    });
    await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/perfil/senha", {
        senha_atual: "SenhaAtual#2026",
        senha: "NovaSenha#2026",
        senha_confirmation: "NovaSenha#2026",
      })
    );

    expect(await screen.findByText(/2 outras sessões foram encerradas/)).toBeInTheDocument();
  });

  it("bloqueia o envio enquanto a confirmação não confere", async () => {
    montar();

    await preencher({
      atual: "SenhaAtual#2026",
      nova: "NovaSenha#2026",
      confirmacao: "OutraCoisa#2026",
    });

    expect(screen.getByText("A confirmação não confere.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar senha" })).toBeDisabled();
  });

  it("bloqueia senha curta demais", async () => {
    montar();

    await preencher({ atual: "SenhaAtual#2026", nova: "curta", confirmacao: "curta" });

    expect(screen.getByText("Use pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar senha" })).toBeDisabled();
  });

  /** Repetir a senha daria a falsa impressão de ter encerrado as outras sessões. */
  it("bloqueia a nova senha igual à atual", async () => {
    montar();

    await preencher({
      atual: "SenhaAtual#2026",
      nova: "SenhaAtual#2026",
      confirmacao: "SenhaAtual#2026",
    });

    expect(
      screen.getByText("A nova senha precisa ser diferente da atual.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar senha" })).toBeDisabled();
  });

  it("avisa que as outras sessões serão encerradas antes do envio", () => {
    montar();

    expect(
      screen.getByText(/as sessões abertas em outros dispositivos são encerradas/)
    ).toBeInTheDocument();
  });

  it("mostra o erro de senha atual incorreta no campo certo", async () => {
    api.put.mockRejectedValue({
      response: {
        status: 422,
        data: { message: "erro", errors: { senha_atual: ["A senha atual está incorreta."] } },
        headers: {},
      },
    });
    montar();

    await preencher({
      atual: "ChutandoAqui#1",
      nova: "NovaSenha#2026",
      confirmacao: "NovaSenha#2026",
    });
    await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

    expect(await screen.findByText("A senha atual está incorreta.")).toBeInTheDocument();
  });
});

describe("Ajustes — metodologia e sessão", () => {
  it("explica as três faixas da regra e a ressalva", () => {
    montar();

    expect(screen.getByText("50% Necessidades")).toBeInTheDocument();
    expect(screen.getByText("30% Desejos")).toBeInTheDocument();
    expect(screen.getByText("20% Poupança")).toBeInTheDocument();
    expect(
      screen.getByText(/Não é recomendação nem aconselhamento financeiro/)
    ).toBeInTheDocument();
  });

  it("pede confirmação antes de sair e explica que nada é apagado", async () => {
    const { valor } = montar();

    await userEvent.click(screen.getByRole("button", { name: /Sair da conta/ }));

    const modal = await screen.findByRole("dialog");
    expect(modal).toHaveTextContent(/Nenhum dado é apagado/);
    expect(valor.sair).not.toHaveBeenCalled();

    await userEvent.click(within(modal).getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(valor.sair).toHaveBeenCalled());
  });
});
