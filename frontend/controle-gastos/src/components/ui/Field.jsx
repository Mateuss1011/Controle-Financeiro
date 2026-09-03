import { useId } from "react";
import "./Field.css";

/**
 * Rótulo + controle + ajuda + erro, com a fiação de acessibilidade pronta.
 *
 * O erro é ligado ao input por aria-describedby e marcado com role="alert", de
 * modo que um leitor de tela anuncia a mensagem no momento em que ela aparece —
 * requisito da Fase 12 do briefing (erros no campo certo, não um "Verifique os
 * dados" genérico no rodapé do formulário).
 */
export default function Field({
  label,
  erro,
  ajuda,
  obrigatorio = false,
  children,
  id: idExterno,
}) {
  const idGerado = useId();
  const id = idExterno ?? idGerado;
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;

  const descritoPor = [erro ? idErro : null, ajuda ? idAjuda : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`cf-campo ${erro ? "cf-campo--invalido" : ""}`}>
      {label && (
        <label className="cf-campo__label" htmlFor={id}>
          {label}
          {obrigatorio && (
            <span className="cf-campo__obrigatorio" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children({
        id,
        "aria-invalid": erro ? true : undefined,
        "aria-describedby": descritoPor || undefined,
        "aria-required": obrigatorio || undefined,
      })}

      {ajuda && !erro && (
        <p className="cf-campo__ajuda" id={idAjuda}>
          {ajuda}
        </p>
      )}

      {erro && (
        <p className="cf-campo__erro" id={idErro} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
