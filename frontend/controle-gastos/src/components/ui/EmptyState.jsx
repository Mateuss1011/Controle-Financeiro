import Button from "./Button";
import "./States.css";

/**
 * Estado vazio.
 *
 * O briefing é explícito: nada de tela em branco. Todo estado vazio diz o que
 * está faltando e oferece o próximo passo.
 */
export default function EmptyState({
  icone,
  titulo,
  descricao,
  acaoRotulo,
  onAcao,
  compacto = false,
}) {
  return (
    <div className={`cf-estado ${compacto ? "cf-estado--compacto" : ""}`}>
      {icone && <div className="cf-estado__icone" aria-hidden="true">{icone}</div>}
      <h3 className="cf-estado__titulo">{titulo}</h3>
      {descricao && <p className="cf-estado__descricao">{descricao}</p>}
      {acaoRotulo && onAcao && (
        <Button variante="primario" onClick={onAcao}>
          {acaoRotulo}
        </Button>
      )}
    </div>
  );
}
