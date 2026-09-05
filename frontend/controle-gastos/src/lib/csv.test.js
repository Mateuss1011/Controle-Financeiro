import { describe, expect, it } from "vitest";
import { montarCsv, numeroParaCsv } from "./csv";

describe("numeroParaCsv", () => {
  it("usa vírgula decimal e duas casas", () => {
    expect(numeroParaCsv(1566.666)).toBe("1566,67");
    expect(numeroParaCsv(4000)).toBe("4000,00");
    expect(numeroParaCsv(-800.5)).toBe("-800,50");
  });

  it("aceita string numérica", () => {
    expect(numeroParaCsv("2086.65")).toBe("2086,65");
  });

  /** Um valor inválido não pode virar "NaN" dentro da planilha do usuário. */
  it("nunca devolve NaN, Infinity ou vazio", () => {
    for (const entrada of [NaN, Infinity, -Infinity, undefined, null, "", "abc", {}]) {
      expect(numeroParaCsv(entrada)).toBe("0,00");
    }
  });
});

describe("montarCsv", () => {
  it("separa com ponto e vírgula e quebra com CRLF", () => {
    const csv = montarCsv(["Mês", "Valor"], [["junho", "10,00"]]);

    expect(csv).toBe("Mês;Valor\r\njunho;10,00");
  });

  /** Uma descrição com ponto e vírgula não pode deslocar as colunas. */
  it("escapa separador, aspas e quebra de linha", () => {
    const csv = montarCsv(
      ["Descrição"],
      [['Mercado; feira'], ['Disse "oi"'], ["duas\nlinhas"]]
    );

    expect(csv).toContain('"Mercado; feira"');
    expect(csv).toContain('"Disse ""oi"""');
    expect(csv).toContain('"duas\nlinhas"');
  });

  it("trata nulo e indefinido como célula vazia", () => {
    expect(montarCsv(["A", "B"], [[null, undefined]])).toBe("A;B\r\n;");
  });
});
