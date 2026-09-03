import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";
import { Card } from "../../../components/ui";
import "./dashboard.css";

const APARENCIA = {
  critico:     { Icone: FiAlertCircle,   classe: "critico" },
  atencao:     { Icone: FiAlertTriangle, classe: "atencao" },
  positivo:    { Icone: FiCheckCircle,   classe: "positivo" },
  informativo: { Icone: FiInfo,          classe: "informativo" },
};

/**
 * O que merece atenção agora.
 *
 * Os insights vêm do backend já filtrados e ordenados por gravidade, no máximo
 * quatro. Uma lista longa de avisos deixa de ser informação e vira ruído — o
 * limite é proposital.
 *
 * A região é aria-live para que um leitor de tela anuncie quando a análise muda
 * ao trocar de competência.
 */
export default function Insights({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <Card
      titulo="Merece sua atenção"
      descricao="Análise automática dos números deste período."
    >
      <ul className="cf-insights" aria-live="polite">
        {insights.map((insight, indice) => {
          const { Icone, classe } = APARENCIA[insight.severidade] ?? APARENCIA.informativo;

          return (
            /*
             * A chave inclui o índice porque `tipo` NÃO é único: um mesmo
             * período pode ter "faixa_estourada" para necessidades E para
             * desejos. Com chaves repetidas o React reaproveitava o nó ao
             * trocar de competência e deixava na tela um insight do mês
             * anterior. A lista é substituída inteira a cada busca e nunca é
             * reordenada no cliente, então o índice é uma chave estável aqui.
             */
            <li
              key={`${insight.tipo}-${indice}`}
              className={`cf-insight cf-insight--${classe}`}
            >
              <span className="cf-insight__icone" aria-hidden="true">
                <Icone />
              </span>
              <div className="cf-insight__texto">
                <p className="cf-insight__titulo">{insight.titulo}</p>
                <p className="cf-insight__mensagem">{insight.mensagem}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
