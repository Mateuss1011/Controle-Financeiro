import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Badge from "./Badge";
import Button from "./Button";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import Field from "./Field";
import Money from "./Money";
import ProgressBar from "./ProgressBar";
import { Input } from "./Input";

describe("Button", () => {
  it("dispara o clique", async () => {
    const aoClicar = vi.fn();
    render(<Button onClick={aoClicar}>Salvar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(aoClicar).toHaveBeenCalledOnce();
  });

  it("não dispara enquanto carrega e anuncia o estado", async () => {
    const aoClicar = vi.fn();
    render(<Button carregando onClick={aoClicar}>Salvar</Button>);

    const botao = screen.getByRole("button");
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("aria-busy", "true");

    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("é type=button por padrão, para não submeter formulário sem querer", () => {
    render(<Button>Ação</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

describe("Field", () => {
  it("associa o rótulo ao controle", () => {
    render(<Field label="Descrição">{(a) => <Input {...a} />}</Field>);

    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
  });

  /**
   * O briefing pede erro no campo certo, não um "Verifique os dados" genérico.
   * O erro precisa chegar ao leitor de tela ligado ao input.
   */
  it("liga a mensagem de erro ao input e a anuncia", () => {
    render(
      <Field label="Valor" erro="O valor deve ser maior que zero.">
        {(a) => <Input {...a} />}
      </Field>
    );

    const input = screen.getByLabelText("Valor");
    const erro = screen.getByRole("alert");

    expect(erro).toHaveTextContent("O valor deve ser maior que zero.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(erro.id);
  });

  it("mostra a ajuda quando não há erro, e some quando há", () => {
    const { rerender } = render(
      <Field label="Valor" ajuda="Use ponto para centavos.">
        {(a) => <Input {...a} />}
      </Field>
    );
    expect(screen.getByText("Use ponto para centavos.")).toBeInTheDocument();

    rerender(
      <Field label="Valor" ajuda="Use ponto para centavos." erro="Inválido">
        {(a) => <Input {...a} />}
      </Field>
    );
    expect(screen.queryByText("Use ponto para centavos.")).not.toBeInTheDocument();
  });
});

describe("Money", () => {
  it("formata em reais", () => {
    render(<Money valor={2086.65} />);
    expect(screen.getByText("R$ 2.086,65")).toBeInTheDocument();
  });

  it("colore pelo sinal quando o tom é automático", () => {
    const { container, rerender } = render(<Money valor={100} tom="automatico" />);
    expect(container.firstChild).toHaveClass("cf-money--positivo");

    rerender(<Money valor={-100} tom="automatico" />);
    expect(container.firstChild).toHaveClass("cf-money--negativo");
  });
});

describe("ProgressBar", () => {
  it("expõe o progresso à tecnologia assistiva", () => {
    render(<ProgressBar rotulo="Necessidades" valor={76.4} />);

    const barra = screen.getByRole("progressbar", { name: "Necessidades" });
    expect(barra).toHaveAttribute("aria-valuenow", "76");
  });

  it("satura a barra em 100% mas mantém o número real", () => {
    const { container } = render(<ProgressBar rotulo="Desejos" valor={109.1} />);

    expect(container.querySelector(".cf-progresso__preenchimento")).toHaveStyle({
      width: "100%",
    });
    expect(screen.getByText("109,1%")).toBeInTheDocument();
  });

  it("com valor inválido não gera largura Infinity", () => {
    const { container } = render(<ProgressBar valor={Infinity} />);

    expect(container.querySelector(".cf-progresso__preenchimento")).toHaveStyle({
      width: "0%",
    });
  });
});

describe("Badge", () => {
  it("usa o tom da faixa da regra 50/30/20", () => {
    const { container } = render(<Badge tom="poupanca">Poupança</Badge>);
    expect(container.firstChild).toHaveClass("cf-badge--poupanca");
  });
});

describe("Estados", () => {
  it("EmptyState oferece o próximo passo", async () => {
    const aoAgir = vi.fn();
    render(
      <EmptyState
        titulo="Você ainda não possui lançamentos"
        descricao="Adicione seu primeiro gasto."
        acaoRotulo="Adicionar lançamento"
        onAcao={aoAgir}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Adicionar lançamento" }));
    expect(aoAgir).toHaveBeenCalledOnce();
  });

  it("ErrorState é anunciado e não mostra jargão técnico", async () => {
    const aoTentar = vi.fn();
    render(<ErrorState onTentarNovamente={aoTentar} />);

    const alerta = screen.getByRole("alert");
    expect(alerta).toBeInTheDocument();
    expect(alerta.textContent).not.toMatch(/exception|SQLSTATE|vendor|stack/i);

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(aoTentar).toHaveBeenCalledOnce();
  });
});
