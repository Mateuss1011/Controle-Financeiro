import { FiArrowDown, FiArrowUp, FiAward, FiTag } from "react-icons/fi";
import { Card } from "../../../components/ui";
import { formatarData, formatarMoeda } from "../../../lib/format";
import "./relatorios.css";

/**
 * Os extremos do período.
 *
 * Um gráfico mostra tudo isso, mas ninguém lê "qual foi o mês mais caro" de
 * olho numa série de doze barras. Cada destaque é uma leitura que o gráfico
 * torna possível e não entrega pronta.
 *
 * Destaque sem base não aparece: um mês vazio venceria sempre o "menor gasto" e
 * não significaria nada.
 */
export default function DestaquesPeriodo({ destaques }) {
  const itens = [];

  if (destaques?.mes_maior_gasto) {
    itens.push({
      chave: "maior",
      icone: <FiArrowUp />,
      rotulo: "Mês de maior gasto",
      valor: destaques.mes_maior_gasto.rotulo,
      detalhe: formatarMoeda(destaques.mes_maior_gasto.gastos),
    });
  }

  if (destaques?.mes_menor_gasto) {
    itens.push({
      chave: "menor",
      icone: <FiArrowDown />,
      rotulo: "Mês de menor gasto",
      valor: destaques.mes_menor_gasto.rotulo,
      detalhe: formatarMoeda(destaques.mes_menor_gasto.gastos),
    });
  }

  if (destaques?.mes_melhor_saldo) {
    itens.push({
      chave: "saldo",
      icone: <FiAward />,
      rotulo: "Melhor saldo",
      valor: destaques.mes_melhor_saldo.rotulo,
      detalhe: formatarMoeda(destaques.mes_melhor_saldo.saldo),
    });
  }

  if (destaques?.maior_lancamento) {
    itens.push({
      chave: "lancamento",
      icone: <FiTag />,
      rotulo: "Maior lançamento",
      valor: destaques.maior_lancamento.descricao || "Sem descrição",
      detalhe: `${formatarMoeda(destaques.maior_lancamento.valor)} · ${formatarData(
        destaques.maior_lancamento.data
      )}`,
    });
  }

  if (itens.length === 0) return null;

  return (
    <Card titulo="Destaques do período">
      <div className="cf-destaques">
        {itens.map((item) => (
          <div key={item.chave} className="cf-destaque">
            <span className="cf-destaque__rotulo">
              <span aria-hidden="true">{item.icone}</span>
              {item.rotulo}
            </span>
            <span className="cf-destaque__valor">{item.valor}</span>
            <span className="cf-destaque__detalhe">{item.detalhe}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
