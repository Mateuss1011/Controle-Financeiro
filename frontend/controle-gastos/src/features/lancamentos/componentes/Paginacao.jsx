import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Button } from "../../../components/ui";
import "./lancamentos.css";

export default function Paginacao({ paginacao, onIr }) {
  if (!paginacao || paginacao.last_page <= 1) return null;

  const { current_page: atual, last_page: ultima, from, to, total } = paginacao;

  return (
    <nav className="cf-paginacao" aria-label="Paginação dos lançamentos">
      <p className="cf-paginacao__contagem" aria-live="polite">
        Exibindo {from}–{to} de {total}
      </p>

      <div className="cf-paginacao__controles">
        <Button
          variante="secundario"
          tamanho="sm"
          onClick={() => onIr(atual - 1)}
          disabled={atual <= 1}
          iconeEsquerda={<FiChevronLeft />}
        >
          Anterior
        </Button>

        <span className="cf-paginacao__pagina">
          Página {atual} de {ultima}
        </span>

        <Button
          variante="secundario"
          tamanho="sm"
          onClick={() => onIr(atual + 1)}
          disabled={atual >= ultima}
          iconeDireita={<FiChevronRight />}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
