import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, EmptyState, Money } from "../../../components/ui";
import { formatarMoeda, formatarPercentual } from "../../../lib/format";
import "./dashboard.css";

/* Cor por FAIXA da regra, não por posição na lista: assim a leitura é a mesma
   em todas as telas e o gráfico ensina a classificação em vez de decorá-la. */
const COR_DO_TIPO = {
  necessidade: "var(--cf-necessidade)",
  desejo: "var(--cf-desejo)",
  poupanca: "var(--cf-poupanca)",
};

export default function GastosPorCategoria({ categorias, total, competencia }) {
  if (!categorias || categorias.length === 0) {
    return (
      <Card titulo="Onde você gastou">
        <EmptyState
          compacto
          titulo="Nenhum gasto neste período"
          descricao="Os lançamentos que você registrar aparecem aqui divididos por categoria."
        />
      </Card>
    );
  }

  return (
    <Card titulo="Onde você gastou" descricao="Distribuição por categoria no período.">
      <div className="cf-categorias">
        <div className="cf-categorias__grafico">
          {/*
            * `key` por competência: ao trocar de período o recharts reaproveitava
            * o gráfico e ficava com zero setores desenhados — um donut vazio na
            * tela. Remontar com dados novos resolve.
            *
            * Animação desligada de propósito: além de ser enfeite num gráfico
            * que já é lido de relance, o html2canvas da exportação em PDF pode
            * capturar o gráfico no meio da transição e gerar um donut incompleto.
            */}
          <ResponsiveContainer width="100%" height={190} key={competencia}>
            <PieChart>
              <Pie
                data={categorias}
                dataKey="total"
                nameKey="categoria"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {categorias.map((c) => (
                  <Cell key={c.categoria_id ?? c.categoria} fill={COR_DO_TIPO[c.tipo] ?? "var(--cf-ink-400)"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(valor, nome) => [formatarMoeda(valor), nome]}
                contentStyle={{
                  borderRadius: "var(--cf-raio-md)",
                  border: "1px solid var(--cf-borda)",
                  fontSize: "var(--cf-texto-sm)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="cf-categorias__centro" aria-hidden="true">
            <span className="cf-categorias__centro-rotulo">Total</span>
            <Money valor={total} tamanho="sm" />
          </div>
        </div>

        <ul className="cf-categorias__lista">
          {categorias.map((categoria) => (
            <li key={categoria.categoria_id ?? categoria.categoria} className="cf-categorias__item">
              <span
                className="cf-categorias__cor"
                style={{ background: COR_DO_TIPO[categoria.tipo] ?? "var(--cf-ink-400)" }}
                aria-hidden="true"
              />
              <span className="cf-categorias__nome">{categoria.categoria}</span>
              <span className="cf-categorias__percentual cf-num">
                {formatarPercentual(categoria.percentual)}
              </span>
              <Money valor={categoria.total} tamanho="sm" />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
