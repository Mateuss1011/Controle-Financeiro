import { FiCalendar, FiEdit2, FiRepeat, FiTrash2 } from "react-icons/fi";
import { Badge, Money, ProgressBar, SkeletonTexto } from "../../../components/ui";
import { formatarMoeda } from "../../../lib/format";
import "./orcamento.css";

const STATUS = {
  normal:     { texto: "Normal",    tom: "positivo", barra: "positivo" },
  atencao:    { texto: "Atenção",   tom: "atencao",  barra: "atencao" },
  estourado:  { texto: "Estourado", tom: "negativo", barra: "negativo" },
  sem_limite: { texto: "Sem limite", tom: "neutro",  barra: "marca" },
};

/**
 * Limite × gasto de cada categoria.
 *
 * A ordem vem do backend, do mais consumido para o menos: o que está perto de
 * estourar precisa ser a primeira coisa que se vê.
 */
export default function ListaOrcamentos({ orcamentos, carregando, onEditar, onExcluir }) {
  if (carregando) {
    return (
      <div className="cf-orcamentos__carregando">
        <SkeletonTexto linhas={5} />
      </div>
    );
  }

  return (
    <ul className="cf-orcamentos">
      {orcamentos.map((item) => {
        const status = STATUS[item.status] ?? STATUS.sem_limite;
        const estourou = item.status === "estourado";

        return (
          <li key={item.categoria_id} className="cf-orcamento">
            <div className="cf-orcamento__cabecalho">
              <div className="cf-orcamento__identidade">
                <span className="cf-orcamento__categoria">{item.categoria}</span>
                <span className="cf-orcamento__vigencia">
                  {item.recorrente ? (
                    <>
                      <FiRepeat aria-hidden="true" /> todo mês
                    </>
                  ) : (
                    <>
                      <FiCalendar aria-hidden="true" /> só neste mês
                    </>
                  )}
                </span>
              </div>

              <div className="cf-orcamento__acoes">
                <Badge tom={status.tom} ponto>{status.texto}</Badge>
                <button
                  type="button"
                  className="cf-item__acao"
                  onClick={() => onEditar(item)}
                  aria-label={`Editar orçamento de ${item.categoria}`}
                  title="Editar"
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  className="cf-item__acao cf-item__acao--perigo"
                  onClick={() => onExcluir(item)}
                  aria-label={`Excluir orçamento de ${item.categoria}`}
                  title="Excluir"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>

            <div className="cf-orcamento__valores">
              <Money valor={item.gasto} tamanho="md" />
              <span className="cf-orcamento__limite">de {formatarMoeda(item.limite)}</span>
            </div>

            <ProgressBar
              valor={item.percentual}
              tom={status.barra}
              rotuloVisivel={false}
              rotulo={`${item.categoria}: ${formatarMoeda(item.gasto)} de ${formatarMoeda(item.limite)}`}
            />

            <p className={`cf-orcamento__restante ${estourou ? "cf-orcamento__restante--estouro" : ""}`}>
              {estourou
                ? `${formatarMoeda(Math.abs(item.restante))} acima do limite`
                : `Ainda pode gastar ${formatarMoeda(item.restante)}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
