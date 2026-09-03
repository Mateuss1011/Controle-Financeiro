import { FiAlertCircle } from "react-icons/fi";
import { Button } from "../../../components/ui";
import "./dashboard.css";

/**
 * Sem renda na competência não existe limite, taxa de economia nem saúde
 * financeira. Em vez de exibir tudo zerado como se fosse um diagnóstico, o
 * Dashboard diz o que falta e oferece a ação.
 */
export default function AvisoSemRenda({ competenciaRotulo, onAdicionarRenda }) {
  return (
    <div className="cf-aviso cf-aviso--atencao" role="status">
      <FiAlertCircle aria-hidden="true" />
      <div className="cf-aviso__texto">
        <p className="cf-aviso__titulo">
          Você ainda não cadastrou uma renda para {competenciaRotulo}.
        </p>
        <p className="cf-aviso__descricao">
          Sem ela não é possível calcular limites, taxa de economia nem saúde financeira.
        </p>
      </div>
      <Button variante="secundario" tamanho="sm" onClick={onAdicionarRenda}>
        Adicionar renda
      </Button>
    </div>
  );
}
