import { FiCopy, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Badge, Money, SkeletonTexto } from "../../../components/ui";
import { caminhoDaCategoria, formatarData } from "../../../lib/format";
import "./lancamentos.css";

const ROTULO_DO_TIPO = {
  necessidade: "Necessidade",
  desejo: "Desejo",
  poupanca: "Poupança",
};

/**
 * Extrato agrupado por dia, com o total de cada dia no cabeçalho.
 *
 * Uma tabela linear de 20 linhas obriga a somar de cabeça para responder
 * "quanto gastei ontem?". O agrupamento por dia é como um extrato bancário se
 * lê — e só é aplicado quando a ordenação é por data; ordenar por valor e
 * ainda agrupar por dia produziria grupos sem sentido.
 */
export default function ListaLancamentos({
  lancamentos,
  carregando,
  agrupar,
  onEditar,
  onDuplicar,
  onExcluir,
}) {
  if (carregando) {
    return (
      <div className="cf-lista__carregando">
        <SkeletonTexto linhas={6} />
      </div>
    );
  }

  const grupos = agrupar ? agruparPorDia(lancamentos) : [{ dia: null, itens: lancamentos }];

  return (
    <div className="cf-lista">
      {grupos.map((grupo) => (
        <section key={grupo.dia ?? "todos"} className="cf-lista__grupo">
          {grupo.dia && (
            <header className="cf-lista__dia">
              <span className="cf-lista__dia-data">{formatarData(grupo.dia)}</span>
              <Money valor={grupo.total} tamanho="sm" tom="suave" />
            </header>
          )}

          <ul className="cf-lista__itens">
            {grupo.itens.map((lancamento) => (
              <li key={lancamento.id} className="cf-item">
                <div className="cf-item__info">
                  <span className="cf-item__descricao">{lancamento.descricao}</span>
                  <span className="cf-item__meta">
                    {caminhoDaCategoria(lancamento.categoria) ?? "Sem categoria"}
                    {!grupo.dia && <> · {formatarData(lancamento.data_lancamento)}</>}
                  </span>
                </div>

                {lancamento.categoria?.tipo && (
                  <Badge tom={lancamento.categoria.tipo}>
                    {ROTULO_DO_TIPO[lancamento.categoria.tipo]}
                  </Badge>
                )}

                <Money valor={lancamento.valor} tamanho="sm" className="cf-item__valor" />

                <div className="cf-item__acoes">
                  <BotaoAcao
                    rotulo={`Editar ${lancamento.descricao}`}
                    onClick={() => onEditar(lancamento)}
                  >
                    <FiEdit2 />
                  </BotaoAcao>
                  <BotaoAcao
                    rotulo={`Duplicar ${lancamento.descricao}`}
                    onClick={() => onDuplicar(lancamento)}
                  >
                    <FiCopy />
                  </BotaoAcao>
                  <BotaoAcao
                    rotulo={`Excluir ${lancamento.descricao}`}
                    perigo
                    onClick={() => onExcluir(lancamento)}
                  >
                    <FiTrash2 />
                  </BotaoAcao>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function BotaoAcao({ children, rotulo, onClick, perigo = false }) {
  return (
    <button
      type="button"
      className={`cf-item__acao ${perigo ? "cf-item__acao--perigo" : ""}`}
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
    >
      {children}
    </button>
  );
}

function agruparPorDia(lancamentos) {
  const porDia = new Map();

  for (const lancamento of lancamentos) {
    const dia = lancamento.data_lancamento;

    if (!porDia.has(dia)) {
      porDia.set(dia, { dia, itens: [], total: 0 });
    }

    const grupo = porDia.get(dia);
    grupo.itens.push(lancamento);
    grupo.total += Number(lancamento.valor) || 0;
  }

  return [...porDia.values()];
}
