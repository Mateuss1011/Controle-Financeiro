import { Badge, Card, EmptyState, Money } from "../../../components/ui";
import { caminhoDaCategoria, formatarData } from "../../../lib/format";
import "./dashboard.css";

const ROTULO_DO_TIPO = {
  necessidade: "Necessidade",
  desejo: "Desejo",
  poupanca: "Poupança",
};

export default function UltimosLancamentos({ lancamentos, onVerTodos, onAdicionar }) {
  if (!lancamentos || lancamentos.length === 0) {
    return (
      <Card titulo="Últimos lançamentos">
        <EmptyState
          compacto
          titulo="Você ainda não possui lançamentos neste período"
          descricao="Registre seu primeiro gasto para começar a acompanhar para onde o dinheiro está indo."
          acaoRotulo="Adicionar lançamento"
          onAcao={onAdicionar}
        />
      </Card>
    );
  }

  return (
    <Card
      titulo="Últimos lançamentos"
      acao={
        <button type="button" className="cf-btn cf-btn--fantasma cf-btn--sm" onClick={onVerTodos}>
          Ver todos
        </button>
      }
      semPadding
    >
      <ul className="cf-lancamentos">
        {lancamentos.map((lancamento) => (
          <li key={lancamento.id} className="cf-lancamento">
            <div className="cf-lancamento__principal">
              <span className="cf-lancamento__descricao">{lancamento.descricao}</span>
              <span className="cf-lancamento__meta">
                {formatarData(lancamento.data_lancamento)}
                {caminhoDaCategoria(lancamento.categoria) && (
                  <> · {caminhoDaCategoria(lancamento.categoria)}</>
                )}
              </span>
            </div>

            <div className="cf-lancamento__direita">
              {lancamento.categoria?.tipo && (
                <Badge tom={lancamento.categoria.tipo}>
                  {ROTULO_DO_TIPO[lancamento.categoria.tipo]}
                </Badge>
              )}
              <Money valor={lancamento.valor} tamanho="sm" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
