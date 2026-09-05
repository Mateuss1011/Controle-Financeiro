import { Card, DataTable, Money } from "../../../components/ui";
import { formatarPercentual } from "../../../lib/format";
import "./relatorios.css";

/**
 * Mês a mês, em números exatos.
 *
 * O gráfico responde "para onde isso vai"; a tabela responde "quanto,
 * exatamente, em março". As duas perguntas são legítimas e nenhuma das duas
 * formas responde bem à outra.
 *
 * Meses sem dado aparecem com o traço em vez de R$ 0,00: zero é um valor
 * medido, ausência não é.
 */
export default function TabelaMensal({ evolucao, carregando }) {
  const colunas = [
    {
      chave: "rotulo",
      titulo: "Mês",
      render: (linha) => <span className="cf-tabela__principal">{linha.rotulo}</span>,
    },
    {
      chave: "renda",
      titulo: "Renda",
      alinhamento: "right",
      render: (linha) =>
        linha.tem_dados ? <Money valor={linha.renda} tamanho="sm" /> : <Traco />,
    },
    {
      chave: "gastos",
      titulo: "Gastos",
      alinhamento: "right",
      render: (linha) =>
        linha.tem_dados ? <Money valor={linha.gastos} tamanho="sm" /> : <Traco />,
    },
    {
      chave: "saldo",
      titulo: "Saldo",
      alinhamento: "right",
      render: (linha) =>
        linha.tem_dados ? (
          <Money
            valor={linha.saldo}
            tamanho="sm"
            tom={linha.saldo >= 0 ? "positivo" : "negativo"}
          />
        ) : (
          <Traco />
        ),
    },
    {
      chave: "taxa_economia",
      titulo: "Economia",
      alinhamento: "right",
      render: (linha) =>
        linha.renda > 0 ? (
          <span className="cf-num">{formatarPercentual(linha.taxa_economia)}</span>
        ) : (
          <Traco />
        ),
    },
  ];

  return (
    <Card
      titulo="Mês a mês"
      descricao="Os mesmos números do gráfico, em detalhe."
      semPadding
    >
      <DataTable
        colunas={colunas}
        dados={evolucao}
        carregando={carregando}
        chave={(linha) => linha.competencia}
      />
    </Card>
  );
}

function Traco() {
  return (
    <span className="cf-tabela__vazio" aria-label="sem dados">
      —
    </span>
  );
}
