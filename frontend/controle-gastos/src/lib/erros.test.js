import { describe, expect, it } from "vitest";
import { extrairErro } from "./erros";

const resposta = (status, data = {}, headers = {}) => ({
  response: { status, data, headers },
});

describe("extrairErro", () => {
  it("mapeia 422 para erro por campo", () => {
    const { campos, mensagem } = extrairErro(
      resposta(422, {
        message: "The given data was invalid.",
        errors: {
          valor: ["O valor deve ser maior que zero."],
          data: ["Informe uma data válida."],
        },
      })
    );

    expect(campos.valor).toBe("O valor deve ser maior que zero.");
    expect(campos.data).toBe("Informe uma data válida.");
    expect(mensagem).toBe("Revise os campos destacados.");
  });

  it("usa a mensagem do servidor em 401", () => {
    const { mensagem, campos } = extrairErro(
      resposta(401, { message: "Credenciais inválidas." })
    );

    expect(mensagem).toBe("Credenciais inválidas.");
    expect(campos).toEqual({});
  });

  it("informa a espera em 429 usando o header Retry-After", () => {
    const { mensagem, esperar } = extrairErro(
      resposta(429, { message: "Too Many Attempts." }, { "retry-after": "42" })
    );

    expect(esperar).toBe(42);
    expect(mensagem).toContain("42 segundos");
  });

  it("usa singular quando falta 1 segundo", () => {
    const { mensagem } = extrairErro(resposta(429, {}, { "retry-after": "1" }));
    expect(mensagem).toContain("1 segundo e");
  });

  it("distingue falha de rede de erro do servidor", () => {
    const { mensagem, status } = extrairErro({ message: "Network Error" });

    expect(status).toBeNull();
    expect(mensagem).toMatch(/conectar ao servidor/i);
  });

  /**
   * Com APP_DEBUG ligado o Laravel devolve exception, arquivo e SQL no corpo.
   * Nada disso pode chegar à tela.
   */
  it("nunca repassa mensagem técnica do servidor", () => {
    const tecnicas = [
      "SQLSTATE[42S02]: Base table or view not found",
      "Call to undefined method App\\Models\\Gasto::foo()",
      "syntax error in /var/www/vendor/laravel/framework/src/Foo.php",
      "SELECT * from gastos where user_id = 1",
    ];

    for (const message of tecnicas) {
      const { mensagem } = extrairErro(resposta(500, { message }));

      expect(mensagem).not.toContain("SQLSTATE");
      expect(mensagem).not.toContain("vendor");
      expect(mensagem).not.toContain("SELECT");
      expect(mensagem).toBe("Não foi possível concluir a operação. Tente novamente.");
    }
  });

  it("descarta mensagem longa demais para ser texto de produto", () => {
    const { mensagem } = extrairErro(resposta(404, { message: "x".repeat(200) }));
    expect(mensagem).toBe("Registro não encontrado.");
  });
});
