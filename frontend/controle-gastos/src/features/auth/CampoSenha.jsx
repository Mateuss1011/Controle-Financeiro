import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Input } from "../../components/ui";

/**
 * Campo de senha com alternância de visibilidade.
 *
 * Digitar senha às cegas no celular é a maior fonte de erro de login. O botão
 * é um <button> real, com aria-pressed, e fica fora da ordem de tabulação
 * natural do formulário para não atrapalhar quem só quer enviar.
 */
export default function CampoSenha({ ...props }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="cf-senha">
      <Input type={visivel ? "text" : "password"} {...props} />

      <button
        type="button"
        className="cf-senha__olho"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        tabIndex={-1}
      >
        {visivel ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
      </button>
    </div>
  );
}
