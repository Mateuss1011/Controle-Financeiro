import { describe, expect, it } from "vitest";
import {
  caminhoDaCategoria,
  competenciaAtual,
  formatarCompetencia,
  formatarCompetenciaCurta,
  formatarData,
  formatarMoeda,
  formatarPercentual,
  numero,
  percentualParaBarra,
  percentualSeguro,
} from "./format";

describe("numero", () => {
  it("converte strings numéricas", () => {
    expect(numero("2086.65")).toBe(2086.65);
  });

  it("nunca devolve NaN", () => {
    for (const entrada of ["abc", null, undefined, "", {}, NaN, Infinity, -Infinity]) {
      expect(Number.isFinite(numero(entrada))).toBe(true);
    }
  });
});

describe("formatarMoeda", () => {
  it("formata em reais", () => {
    // O Intl separa 'R$' do valor com U+00A0 (espaço não separável), e não
    // com um espaço comum — os literais abaixo carregam esse caractere.
    expect(formatarMoeda(2086.65)).toBe("R$ 2.086,65");
    expect(formatarMoeda(0)).toBe("R$ 0,00");
    expect(formatarMoeda(-320.9)).toBe("-R$ 320,90");
  });

  it("não quebra com entrada inválida", () => {
    expect(formatarMoeda(undefined)).toBe("R$ 0,00");
    expect(formatarMoeda("não é número")).toBe("R$ 0,00");
  });
});

describe("percentualSeguro", () => {
  it("calcula o percentual", () => {
    expect(percentualSeguro(2100, 2750)).toBeCloseTo(76.36, 2);
    expect(percentualSeguro(1800, 1650)).toBeCloseTo(109.09, 2);
  });

  /**
   * A regressão que este teste protege: com renda 0 a tela antiga renderizava
   * "Infinity% do salário" e barras com width: Infinity%.
   */
  it("devolve 0 quando o total é zero, negativo ou ausente", () => {
    expect(percentualSeguro(500, 0)).toBe(0);
    expect(percentualSeguro(500, -100)).toBe(0);
    expect(percentualSeguro(500, null)).toBe(0);
    expect(percentualSeguro(500, undefined)).toBe(0);
  });

  it("nunca devolve Infinity nem NaN", () => {
    const casos = [
      [500, 0], [0, 0], [-500, 0], ["abc", "xyz"], [Infinity, 100], [100, Infinity],
    ];

    for (const [parte, total] of casos) {
      const resultado = percentualSeguro(parte, total);
      expect(Number.isFinite(resultado)).toBe(true);
    }
  });
});

describe("percentualParaBarra", () => {
  it("limita a largura entre 0 e 100", () => {
    expect(percentualParaBarra(109.1)).toBe(100);
    expect(percentualParaBarra(-20)).toBe(0);
    expect(percentualParaBarra(76.4)).toBe(76.4);
    expect(percentualParaBarra(Infinity)).toBe(0);
  });
});

describe("formatarPercentual", () => {
  it("usa vírgula decimal", () => {
    expect(formatarPercentual(76.36)).toBe("76,4%");
    expect(formatarPercentual(0)).toBe("0,0%");
  });
});

describe("formatarData", () => {
  it("converte ISO para o formato brasileiro", () => {
    expect(formatarData("2026-09-02")).toBe("02/09/2026");
  });

  /** new Date('2026-09-02') é UTC e exibiria 01/09 em fusos negativos. */
  it("não desloca o dia por causa do fuso", () => {
    expect(formatarData("2026-01-01")).toBe("01/01/2026");
    expect(formatarData("2026-12-31")).toBe("31/12/2026");
  });

  it("tolera valor ausente", () => {
    expect(formatarData(null)).toBe("—");
    expect(formatarData("")).toBe("—");
  });
});

describe("competência", () => {
  it("escreve o mês por extenso", () => {
    expect(formatarCompetencia("2026-09")).toBe("setembro de 2026");
    expect(formatarCompetenciaCurta("2026-09")).toBe("set/2026");
  });

  it("tolera valor inválido", () => {
    expect(formatarCompetencia(null)).toBe("—");
    expect(formatarCompetencia("2026-99")).toBe("—");
  });

  it("gera a competência atual no formato da API", () => {
    expect(competenciaAtual()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("caminhoDaCategoria", () => {
  it("mostra a mãe antes da filha", () => {
    expect(
      caminhoDaCategoria({ nome: "Aluguel", categoria_pai: "Moradia" })
    ).toBe("Moradia › Aluguel");
  });

  it("mostra só o nome quando a categoria é principal", () => {
    expect(caminhoDaCategoria({ nome: "Moradia" })).toBe("Moradia");
    expect(caminhoDaCategoria({ nome: "Moradia", categoria_pai: null })).toBe("Moradia");
  });

  /** Categoria ausente é caso real: o chamador decide o texto de fallback. */
  it("devolve null sem categoria", () => {
    expect(caminhoDaCategoria(null)).toBeNull();
    expect(caminhoDaCategoria(undefined)).toBeNull();
    expect(caminhoDaCategoria({})).toBeNull();
  });
});
