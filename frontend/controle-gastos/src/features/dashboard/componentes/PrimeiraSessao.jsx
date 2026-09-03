import { FiArrowRight, FiDollarSign, FiPlusCircle, FiTarget } from "react-icons/fi";
import { Button, Card } from "../../../components/ui";
import "./dashboard.css";

/**
 * Primeira sessão.
 *
 * Uma conta nova não pode receber uma parede de "R$ 0,00 / 0% / 0%": isso não
 * é informação, é ausência dela. Aqui o vazio vira um roteiro de três passos
 * com a ação principal em destaque.
 */
export default function PrimeiraSessao({ onAdicionarRenda, onAdicionarLancamento }) {
  const passos = [
    {
      icone: FiDollarSign,
      titulo: "Cadastre sua renda",
      texto: "É a base de todos os limites e da sua saúde financeira.",
    },
    {
      icone: FiPlusCircle,
      titulo: "Registre seu primeiro gasto",
      texto: "Com alguns lançamentos já dá para ver para onde o dinheiro vai.",
    },
    {
      icone: FiTarget,
      titulo: "Defina um orçamento",
      texto: "Em breve você poderá fixar limites por categoria.",
      indisponivel: true,
    },
  ];

  return (
    <Card>
      <div className="cf-primeira">
        <h2 className="cf-primeira__titulo">Vamos organizar suas finanças</h2>
        <p className="cf-primeira__descricao">
          Três passos para o Controle Financeiro começar a trabalhar por você.
        </p>

        <ol className="cf-primeira__passos">
          {passos.map(({ icone: Icone, titulo, texto, indisponivel }, indice) => (
            <li
              key={titulo}
              className={`cf-primeira__passo ${indisponivel ? "cf-primeira__passo--indisponivel" : ""}`}
            >
              <span className="cf-primeira__numero" aria-hidden="true">{indice + 1}</span>
              <span className="cf-primeira__icone" aria-hidden="true"><Icone /></span>
              <span className="cf-primeira__texto">
                <span className="cf-primeira__passo-titulo">
                  {titulo}
                  {indisponivel && <span className="cf-navitem__breve">em breve</span>}
                </span>
                <span className="cf-primeira__passo-descricao">{texto}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="cf-primeira__acoes">
          <Button tamanho="lg" onClick={onAdicionarLancamento} iconeDireita={<FiArrowRight />}>
            Adicionar lançamento
          </Button>
          <Button tamanho="lg" variante="secundario" onClick={onAdicionarRenda}>
            Adicionar renda
          </Button>
        </div>
      </div>
    </Card>
  );
}
