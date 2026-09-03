import Money from "./Money";
import Skeleton from "./Skeleton";
import "./StatCard.css";

/**
 * Indicador financeiro de topo de tela.
 *
 * Responde a uma pergunta por vez ("quanto entrou?", "quanto saiu?"). Aceita
 * `carregando` para não piscar entre esqueleto e valor.
 *
 * Por padrão formata `valor` como moeda. Quando o indicador não é dinheiro —
 * uma taxa, por exemplo — passe `conteudo` com o texto já formatado.
 */
export default function StatCard({
  rotulo,
  valor,
  conteudo,
  tomValor = "padrao",
  detalhe,
  icone,
  destaque = false,
  carregando = false,
}) {
  return (
    <div className={`cf-stat ${destaque ? "cf-stat--destaque" : ""}`}>
      <div className="cf-stat__topo">
        <span className="cf-stat__rotulo">{rotulo}</span>
        {icone && <span className="cf-stat__icone" aria-hidden="true">{icone}</span>}
      </div>

      {carregando ? (
        <Skeleton largura="60%" altura="28px" />
      ) : conteudo !== undefined ? (
        <span className={`cf-stat__conteudo cf-money--${tomValor} cf-num`}>
          {conteudo}
        </span>
      ) : (
        <Money valor={valor} tamanho="lg" tom={tomValor} />
      )}

      {detalhe && !carregando && (
        <span className="cf-stat__detalhe">{detalhe}</span>
      )}
    </div>
  );
}
