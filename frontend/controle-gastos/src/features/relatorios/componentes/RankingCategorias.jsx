import { Card, EmptyState, Money, ProgressBar } from "../../../components/ui";
import { formatarMoeda, formatarPercentual } from "../../../lib/format";
import "./relatorios.css";

const COR_DO_TIPO = {
  necessidade: "var(--cf-necessidade)",
  desejo: "var(--cf-desejo)",
  poupanca: "var(--cf-poupanca)",
};

/**
 * Onde o dinheiro foi, no período inteiro.
 *
 * A cor vem da FAIXA da regra, não da posição na lista — a mesma leitura de
 * todas as outras telas, para o gráfico ensinar a classificação em vez de
 * exigir que se decore uma legenda nova.
 *
 * A média mensal está ao lado do total porque é o número acionável: "R$ 3.100
 * em três meses" só vira decisão quando se lê "R$ 1.033 por mês".
 */
export default function RankingCategorias({ categorias, total, meses }) {
  if (!categorias || categorias.length === 0) {
    return (
      <Card titulo="Onde você gastou">
        <EmptyState
          compacto
          titulo="Nenhum gasto neste intervalo"
          descricao="Os lançamentos do período aparecem aqui divididos por categoria."
        />
      </Card>
    );
  }

  return (
    <Card
      titulo="Onde você gastou"
      descricao={`Da categoria mais consumida para a menos, somando ${meses} ${
        meses === 1 ? "mês" : "meses"
      }.`}
      semPadding
    >
      <ul className="cf-ranking">
        {categorias.map((categoria) => (
          <li key={categoria.categoria_id} className="cf-ranking__item">
            <div className="cf-ranking__topo">
              <span className="cf-ranking__identidade">
                <span
                  className="cf-ranking__cor"
                  style={{ background: COR_DO_TIPO[categoria.tipo] ?? "var(--cf-ink-400)" }}
                  aria-hidden="true"
                />
                <span className="cf-ranking__nome">{categoria.categoria}</span>
              </span>
              <Money valor={categoria.total} tamanho="sm" />
            </div>

            <ProgressBar
              valor={categoria.percentual}
              tom="marca"
              rotuloVisivel={false}
              rotulo={`${categoria.categoria}: ${formatarMoeda(categoria.total)} de ${formatarMoeda(total)}`}
            />

            <div className="cf-ranking__rodape">
              <span>
                {formatarPercentual(categoria.percentual)} dos gastos ·{" "}
                {categoria.lancamentos}{" "}
                {categoria.lancamentos === 1 ? "lançamento" : "lançamentos"}
              </span>
              <span>{formatarMoeda(categoria.media_mensal)}/mês</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
