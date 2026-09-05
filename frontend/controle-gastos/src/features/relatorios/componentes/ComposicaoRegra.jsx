import { Card, ProgressBar } from "../../../components/ui";
import { formatarMoeda, formatarPercentual } from "../../../lib/format";
import "./relatorios.css";

const COR_DO_TIPO = {
  necessidade: "var(--cf-necessidade)",
  desejo: "var(--cf-desejo)",
  poupanca: "var(--cf-poupanca)",
};

/**
 * A regra 50/30/20 no acumulado do intervalo.
 *
 * Mesma metodologia da tela do Dashboard, só que somada: necessidades e desejos
 * são TETOS (passar é ruim), poupança é META (atingir é bom). O que muda é o
 * denominador — a renda somada do período, e não a de um mês.
 *
 * Sem renda no intervalo não existe alvo. Mostrar "0% de R$ 0,00" pareceria um
 * diagnóstico quando é ausência de base, então o card diz isso com palavras.
 */
export default function ComposicaoRegra({ porTipo, temRenda }) {
  return (
    <Card
      titulo="Composição 50/30/20"
      descricao="Soma do período comparada ao que a regra recomenda."
    >
      <ul className="cf-composicao">
        {(porTipo ?? []).map((faixa) => {
          const meta = faixa.tipo === "poupanca";
          const estourou = !meta && faixa.diferenca < 0;
          const atingiu = meta && faixa.total >= faixa.alvo && faixa.alvo > 0;

          return (
            <li key={faixa.tipo}>
              <div className="cf-composicao__topo">
                <span className="cf-composicao__faixa">
                  <span
                    className="cf-evolucao__marca"
                    style={{ background: COR_DO_TIPO[faixa.tipo] }}
                    aria-hidden="true"
                  />
                  {faixa.rotulo}
                </span>
                <span className="cf-composicao__alvo">
                  {formatarMoeda(faixa.total)}
                  {temRenda && <> de {formatarMoeda(faixa.alvo)}</>}
                </span>
              </div>

              <ProgressBar
                valor={temRenda ? faixa.percentual_alvo : faixa.percentual}
                tom={estourou ? "negativo" : atingiu ? "positivo" : "marca"}
                rotuloVisivel={false}
                rotulo={
                  temRenda
                    ? `${faixa.rotulo}: ${formatarMoeda(faixa.total)} de ${formatarMoeda(faixa.alvo)}`
                    : `${faixa.rotulo}: ${formatarPercentual(faixa.percentual)} dos gastos`
                }
              />

              {temRenda ? (
                <p
                  className={`cf-composicao__resultado ${
                    estourou ? "cf-composicao__resultado--estouro" : ""
                  }`}
                >
                  {estourou
                    ? `${formatarMoeda(Math.abs(faixa.diferenca))} acima do recomendado no período`
                    : meta
                      ? atingiu
                        ? "Meta de poupança alcançada no período"
                        : `Faltaram ${formatarMoeda(faixa.diferenca)} para a meta`
                      : `${formatarMoeda(faixa.diferenca)} abaixo do teto`}
                  {" · "}
                  {formatarPercentual(faixa.percentual_renda)} da renda
                </p>
              ) : (
                <p className="cf-composicao__resultado">
                  {formatarPercentual(faixa.percentual)} dos gastos do período
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {!temRenda && (
        <p className="cf-composicao__sem-renda">
          Sem renda registrada no intervalo não há como calcular os limites da
          regra. As barras mostram apenas como os gastos se dividiram.
        </p>
      )}
    </Card>
  );
}
