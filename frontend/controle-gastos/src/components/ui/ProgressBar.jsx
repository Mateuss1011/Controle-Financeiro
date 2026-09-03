import { percentualParaBarra, formatarPercentual, numero } from "../../lib/format";
import "./ProgressBar.css";

/**
 * Barra de progresso de orçamento.
 *
 * A largura passa por percentualParaBarra, que limita a 0-100: a versão
 * anterior gerava `width: Infinity%` quando o salário era zero. Valores acima
 * de 100% continuam sendo comunicados pelo número e pelo tom, mas a barra
 * enche e para.
 */
export default function ProgressBar({
  valor,
  tom = "marca",
  rotulo,
  // Quando o texto do rótulo já aparece na tela logo acima da barra, exibi-lo
  // de novo é ruído — mas ele continua servindo de aria-label.
  rotuloVisivel = true,
  mostrarPercentual = true,
  tamanho = "md",
}) {
  const percentual = numero(valor);
  const largura = percentualParaBarra(percentual);

  return (
    <div className="cf-progresso">
      {((rotulo && rotuloVisivel) || mostrarPercentual) && (
        <div className="cf-progresso__topo">
          {rotulo && rotuloVisivel && (
            <span className="cf-progresso__rotulo">{rotulo}</span>
          )}
          {!rotuloVisivel && <span />}
          {mostrarPercentual && (
            <span className={`cf-progresso__valor cf-progresso__valor--${tom} cf-num`}>
              {formatarPercentual(percentual)}
            </span>
          )}
        </div>
      )}

      <div
        className={`cf-progresso__trilho cf-progresso__trilho--${tamanho}`}
        role="progressbar"
        aria-valuenow={Math.round(largura)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo || undefined}
      >
        <div
          className={`cf-progresso__preenchimento cf-progresso__preenchimento--${tom}`}
          style={{ width: `${largura}%` }}
        />
      </div>
    </div>
  );
}
