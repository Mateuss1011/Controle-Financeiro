import Button from "./Button";
import "./States.css";

/**
 * Estado de erro.
 *
 * Mostra linguagem de produto, nunca a mensagem técnica do Laravel: sem
 * "SQLSTATE", sem "exception", sem caminho de arquivo. O detalhe técnico, se
 * houver, fica no console.
 */
export default function ErrorState({
  titulo = "Não foi possível carregar",
  descricao = "Verifique sua conexão e tente novamente.",
  onTentarNovamente,
  compacto = false,
}) {
  return (
    <div
      className={`cf-estado cf-estado--erro ${compacto ? "cf-estado--compacto" : ""}`}
      role="alert"
    >
      <div className="cf-estado__icone" aria-hidden="true">!</div>
      <h3 className="cf-estado__titulo">{titulo}</h3>
      <p className="cf-estado__descricao">{descricao}</p>
      {onTentarNovamente && (
        <Button variante="secundario" onClick={onTentarNovamente}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
