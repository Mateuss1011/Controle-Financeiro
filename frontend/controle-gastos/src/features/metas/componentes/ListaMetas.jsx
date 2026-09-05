import { FiCalendar, FiCheck, FiEdit2, FiPlusCircle, FiTrash2 } from "react-icons/fi";
import { Badge, Money, ProgressBar, SkeletonTexto } from "../../../components/ui";
import { formatarData, formatarMoeda } from "../../../lib/format";
import "./metas.css";

const STATUS = {
  em_andamento: { texto: "Em andamento", tom: "marca",    barra: "marca" },
  sem_prazo:    { texto: "Sem prazo",    tom: "neutro",   barra: "marca" },
  vencida:      { texto: "Prazo vencido", tom: "negativo", barra: "negativo" },
  concluida:    { texto: "Concluída",    tom: "positivo", barra: "positivo" },
};

/**
 * Metas com progresso, prazo e o aporte mensal que cada uma exige.
 *
 * A ordem vem do backend: prazo mais próximo primeiro, metas sem prazo por
 * último. O que tem data para fechar é o que precisa de decisão.
 */
export default function ListaMetas({ metas, carregando, onAportar, onEditar, onExcluir }) {
  if (carregando) {
    return (
      <div className="cf-metas__carregando">
        <SkeletonTexto linhas={5} />
      </div>
    );
  }

  return (
    <ul className="cf-metas">
      {metas.map((meta) => {
        const status = STATUS[meta.status] ?? STATUS.sem_prazo;
        const concluida = meta.status === "concluida";
        const vencida = meta.status === "vencida";

        return (
          <li
            key={meta.id}
            className={`cf-meta ${concluida ? "cf-meta--concluida" : ""}`}
          >
            <div className="cf-meta__cabecalho">
              <div className="cf-meta__identidade">
                <span className="cf-meta__nome">{meta.nome}</span>
                {meta.prazo && (
                  <span className="cf-meta__prazo">
                    <FiCalendar aria-hidden="true" /> até {formatarData(meta.prazo)}
                  </span>
                )}
              </div>

              <div className="cf-meta__acoes">
                <Badge tom={status.tom} ponto>{status.texto}</Badge>

                {!concluida && (
                  <button
                    type="button"
                    className="cf-item__acao"
                    onClick={() => onAportar(meta)}
                    aria-label={`Registrar valor guardado em ${meta.nome}`}
                    title="Registrar valor guardado"
                  >
                    <FiPlusCircle />
                  </button>
                )}
                <button
                  type="button"
                  className="cf-item__acao"
                  onClick={() => onEditar(meta)}
                  aria-label={`Editar meta ${meta.nome}`}
                  title="Editar"
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  className="cf-item__acao cf-item__acao--perigo"
                  onClick={() => onExcluir(meta)}
                  aria-label={`Excluir meta ${meta.nome}`}
                  title="Excluir"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>

            <div className="cf-meta__valores">
              <Money valor={meta.valor_atual} tamanho="md" />
              <span className="cf-meta__objetivo">
                de {formatarMoeda(meta.valor_objetivo)}
              </span>
            </div>

            <ProgressBar
              valor={meta.percentual}
              tom={status.barra}
              rotuloVisivel={false}
              rotulo={`${meta.nome}: ${formatarMoeda(meta.valor_atual)} de ${formatarMoeda(
                meta.valor_objetivo
              )}`}
            />

            <div className="cf-meta__rodape">
              {concluida ? (
                <span>
                  <FiCheck aria-hidden="true" /> Objetivo alcançado
                </span>
              ) : (
                <span className={vencida ? "cf-meta__restante--vencida" : undefined}>
                  Faltam {formatarMoeda(meta.restante)}
                  {vencida && " — o prazo já passou"}
                </span>
              )}

              {/* Só metas com prazo têm aporte: sem data não há urgência a
                  inferir, e inventar uma seria pior do que não mostrar nada. */}
              {!concluida && meta.aporte_mensal > 0 && (
                <span className="cf-meta__aporte">
                  {formatarMoeda(meta.aporte_mensal)}/mês
                  {meta.meses_restantes > 1 && ` por ${meta.meses_restantes} meses`}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
