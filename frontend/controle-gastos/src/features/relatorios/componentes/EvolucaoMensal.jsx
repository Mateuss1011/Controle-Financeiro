import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState } from "../../../components/ui";
import { formatarMoeda, formatarMoedaCompacta } from "../../../lib/format";
import "./relatorios.css";

const SERIES = [
  { chave: "renda", rotulo: "Renda", cor: "var(--cf-poupanca)" },
  { chave: "gastos", rotulo: "Gastos", cor: "var(--cf-desejo)" },
  { chave: "saldo", rotulo: "Saldo", cor: "var(--cf-brand-500)" },
];

/**
 * Renda × gastos em barras, saldo em linha.
 *
 * As barras respondem "quanto entrou e saiu"; a linha, "sobrou ou faltou" — e é
 * a única série que pode ficar negativa, por isso é linha e não barra: uma
 * barra para baixo do zero briga com as outras duas pelo mesmo eixo.
 *
 * A série vem contígua do backend, com os meses vazios incluídos. Escondê-los
 * encostaria dezembro em fevereiro e faria a tendência mentir.
 */
export default function EvolucaoMensal({ evolucao, intervalo }) {
  const temAlgo = (evolucao ?? []).some((mes) => mes.tem_dados);

  if (!temAlgo) {
    return (
      <Card titulo="Evolução mensal">
        <EmptyState
          compacto
          titulo="Nenhum dado neste intervalo"
          descricao="Escolha outro período ou registre renda e lançamentos para ver a evolução."
        />
      </Card>
    );
  }

  return (
    <Card
      titulo="Evolução mensal"
      descricao="Quanto entrou, quanto saiu e o que sobrou em cada mês."
    >
      <div className="cf-evolucao__grafico">
        {/*
          * `key` pelo intervalo: sem isso o recharts reaproveita o gráfico ao
          * trocar de período e desenha zero séries — mesmo bug do donut do
          * Dashboard. Animação desligada para o html2canvas do PDF não capturar
          * o gráfico no meio da transição.
          */}
        <ResponsiveContainer width="100%" height={260} key={intervalo}>
          <ComposedChart
            data={evolucao}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cf-borda)" />
            <XAxis
              dataKey="rotulo_curto"
              tick={{ fontSize: 11, fill: "var(--cf-texto-suave)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--cf-borda)" }}
            />
            <YAxis
              tickFormatter={formatarMoedaCompacta}
              tick={{ fontSize: 11, fill: "var(--cf-texto-suave)" }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              formatter={(valor, nome) => [formatarMoeda(valor), nome]}
              labelFormatter={(_, carga) => carga?.[0]?.payload?.rotulo ?? ""}
              contentStyle={{
                borderRadius: "var(--cf-raio-md)",
                border: "1px solid var(--cf-borda)",
                fontSize: "var(--cf-texto-sm)",
              }}
            />
            <Bar dataKey="renda" name="Renda" fill="var(--cf-poupanca)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="gastos" name="Gastos" fill="var(--cf-desejo)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="saldo"
              name="Saldo"
              stroke="var(--cf-brand-500)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul className="cf-evolucao__legenda">
        {SERIES.map((serie) => (
          <li key={serie.chave} className="cf-evolucao__item">
            <span
              className="cf-evolucao__marca"
              style={{ background: serie.cor }}
              aria-hidden="true"
            />
            {serie.rotulo}
          </li>
        ))}
      </ul>
    </Card>
  );
}
