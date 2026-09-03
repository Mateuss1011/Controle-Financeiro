import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiInfo } from "react-icons/fi";
import { Badge, Card, ProgressBar } from "../../../components/ui";
import { formatarPercentual, percentualSeguro } from "../../../lib/format";
import "./dashboard.css";

const TOM_POR_CLASSIFICACAO = {
  excelente: "positivo",
  saudavel: "positivo",
  atencao: "atencao",
  critica: "negativo",
};

/**
 * Índice de Saúde Financeira.
 *
 * A pontuação é inútil se o usuário não souber de onde ela veio, então os
 * quatro indicadores e a metodologia ficam a um clique — visíveis, não
 * escondidos. Sem base suficiente, o card diz isso em vez de inventar um número.
 */
export default function CartaoSaude({ saude, onAdicionarRenda }) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);

  if (!saude.suficiente) {
    return (
      <Card titulo="Saúde financeira">
        <div className="cf-saude__vazia">
          <FiInfo aria-hidden="true" />
          <div>
            <p className="cf-saude__vazia-titulo">
              Dados insuficientes para calcular sua saúde financeira.
            </p>
            <p className="cf-saude__vazia-motivo">{saude.motivo}</p>
          </div>
        </div>

        {onAdicionarRenda && (
          <button type="button" className="cf-btn cf-btn--secundario cf-btn--sm" onClick={onAdicionarRenda}>
            Adicionar renda
          </button>
        )}
      </Card>
    );
  }

  const tom = TOM_POR_CLASSIFICACAO[saude.classificacao] ?? "neutro";

  return (
    <Card titulo="Saúde financeira">
      <div className="cf-saude">
        <div className={`cf-saude__nota cf-saude__nota--${saude.classificacao}`}>
          <span className="cf-saude__pontuacao cf-num">{saude.pontuacao}</span>
          <span className="cf-saude__escala">/100</span>
        </div>

        <div className="cf-saude__texto">
          <Badge tom={tom} ponto>{saude.rotulo}</Badge>
          <p className="cf-saude__resumo">{saude.resumo}</p>
        </div>
      </div>

      <button
        type="button"
        className="cf-saude__toggle"
        onClick={() => setDetalhesAbertos((aberto) => !aberto)}
        aria-expanded={detalhesAbertos}
        aria-controls="saude-indicadores"
      >
        {detalhesAbertos ? "Ocultar" : "Ver"} como a pontuação foi calculada
        {detalhesAbertos ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
      </button>

      {detalhesAbertos && (
        <div className="cf-saude__indicadores" id="saude-indicadores">
          {saude.indicadores.map((indicador) => (
            <div key={indicador.chave} className="cf-saude__indicador">
              <div className="cf-saude__indicador-topo">
                <span className="cf-saude__indicador-rotulo">{indicador.rotulo}</span>
                <span className="cf-saude__indicador-pontos cf-num">
                  {indicador.pontos.toString().replace(".", ",")} de{" "}
                  {indicador.pontos_maximos.toString().replace(".", ",")} pts
                </span>
              </div>

              <ProgressBar
                valor={percentualSeguro(indicador.pontos, indicador.pontos_maximos)}
                tom={tom}
                mostrarPercentual={false}
                tamanho="sm"
              />

              <p className="cf-saude__indicador-explicacao">
                {formatarPercentual(indicador.valor)} da renda · {indicador.referencia}
              </p>
            </div>
          ))}

          <p className="cf-saude__metodologia">{saude.metodologia}</p>
        </div>
      )}
    </Card>
  );
}
