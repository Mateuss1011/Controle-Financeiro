import { formatarMoeda, numero } from "../../lib/format";
import "./Money.css";

/**
 * Valor monetário.
 *
 * Único ponto do produto que renderiza dinheiro. Usa numerais tabulares para
 * que colunas de valores fiquem alinhadas, e `tom="automatico"` colore pelo
 * sinal — verde para saldo positivo, vermelho para negativo.
 */
export default function Money({
  valor,
  tamanho = "md",
  tom = "padrao",
  sinal = false,
  className = "",
}) {
  const n = numero(valor);

  const tomFinal =
    tom === "automatico" ? (n >= 0 ? "positivo" : "negativo") : tom;

  const prefixo = sinal && n > 0 ? "+" : "";

  return (
    <span
      className={`cf-money cf-money--${tamanho} cf-money--${tomFinal} cf-num ${className}`.trim()}
    >
      {prefixo}
      {formatarMoeda(n)}
    </span>
  );
}
