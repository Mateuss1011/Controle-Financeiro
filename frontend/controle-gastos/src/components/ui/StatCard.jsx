import Money from "./Money";
import Skeleton from "./Skeleton";
import "./StatCard.css";

/**
 * Indicador financeiro de topo de tela.
 *
 * Responde a uma pergunta por vez ("quanto entrou?", "quanto saiu?"). Aceita
 * `carregando` para não piscar entre esqueleto e valor.
 */
export default function StatCard({
  rotulo,
  valor,
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
      ) : (
        <Money valor={valor} tamanho="lg" tom={tomValor} />
      )}

      {detalhe && !carregando && (
        <span className="cf-stat__detalhe">{detalhe}</span>
      )}
    </div>
  );
}
