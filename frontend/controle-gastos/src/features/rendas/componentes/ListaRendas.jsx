import { FiArrowDown, FiArrowUp, FiEdit2, FiMinus, FiTrash2 } from "react-icons/fi";
import { Badge, Money, SkeletonTexto } from "../../../components/ui";
import { formatarCompetencia, formatarPercentual } from "../../../lib/format";
import "./rendas.css";

/**
 * Histórico de rendas, da competência mais recente para a mais antiga.
 *
 * Cada linha diz três coisas: de que mês é, quanto foi e como se compara ao mês
 * anterior. A competência corrente é marcada — saber qual renda está valendo
 * agora é a pergunta mais frequente nesta tela.
 */
export default function ListaRendas({
  rendas,
  resumo,
  carregando,
  onEditar,
  onExcluir,
}) {
  if (carregando) {
    return (
      <div className="cf-rendas__carregando">
        <SkeletonTexto linhas={4} />
      </div>
    );
  }

  return (
    <ul className="cf-rendas">
      {rendas.map((renda) => {
        const variacao = resumo?.variacoes?.[renda.competencia];
        const ehAtual = renda.competencia === resumo?.competencia_atual;

        return (
          <li key={renda.id} className={`cf-renda ${ehAtual ? "cf-renda--atual" : ""}`}>
            <div className="cf-renda__periodo">
              <span className="cf-renda__competencia">
                {formatarCompetencia(renda.competencia)}
              </span>
              {ehAtual && <Badge tom="marca">Período atual</Badge>}
              {renda.descricao && (
                <span className="cf-renda__descricao">{renda.descricao}</span>
              )}
            </div>

            <div className="cf-renda__numeros">
              <Money valor={renda.valor} tamanho="md" />
              <Variacao dados={variacao} />
            </div>

            <div className="cf-renda__acoes">
              <button
                type="button"
                className="cf-item__acao"
                onClick={() => onEditar(renda)}
                aria-label={`Editar renda de ${formatarCompetencia(renda.competencia)}`}
                title="Editar"
              >
                <FiEdit2 />
              </button>
              <button
                type="button"
                className="cf-item__acao cf-item__acao--perigo"
                onClick={() => onExcluir(renda)}
                aria-label={`Excluir renda de ${formatarCompetencia(renda.competencia)}`}
                title="Excluir"
              >
                <FiTrash2 />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Comparação com a competência anterior. Sem base, nada é exibido. */
function Variacao({ dados }) {
  if (!dados || dados.variacao_percentual === null) {
    return <span className="cf-renda__sem-variacao">—</span>;
  }

  const valor = dados.variacao_percentual;

  if (valor === 0) {
    return (
      <span className="cf-variacao cf-variacao--neutra">
        <FiMinus aria-hidden="true" /> igual ao mês anterior
      </span>
    );
  }

  const subiu = valor > 0;
  const Icone = subiu ? FiArrowUp : FiArrowDown;

  return (
    <span className={`cf-variacao ${subiu ? "cf-variacao--boa" : "cf-variacao--ruim"}`}>
      <Icone aria-hidden="true" />
      {formatarPercentual(Math.abs(valor))} vs. {formatarCompetencia(dados.competencia_anterior)}
    </span>
  );
}
