import { FiArrowDown, FiArrowUp, FiMinus } from "react-icons/fi";
import { StatCard } from "../../../components/ui";
import { Grid } from "../../../components/layout";
import { formatarMoeda, formatarPercentual } from "../../../lib/format";
import "./dashboard.css";

/**
 * As quatro perguntas de abertura: quanto entrou, quanto saiu, quanto sobrou e
 * quanto disso foi economizado.
 *
 * A comparação com o mês anterior só aparece quando o backend confirma que há
 * base — comparar contra um mês vazio produziria "+100%" para qualquer valor.
 */
export default function ResumoFinanceiro({ resumo, comparacao, carregando }) {
  const comparar = (chave) =>
    comparacao?.disponivel ? comparacao[chave] : null;

  return (
    <Grid minimo="210px">
      <StatCard
        rotulo="Renda"
        valor={resumo.renda}
        destaque
        carregando={carregando}
        detalhe={<Variacao dados={comparar("renda")} inverter />}
      />
      <StatCard
        rotulo="Gastos"
        valor={resumo.gastos}
        tomValor={resumo.gastos > 0 ? "negativo" : "padrao"}
        carregando={carregando}
        detalhe={
          <span className="cf-dash__detalhes">
            <Variacao dados={comparar("gastos")} />
            {resumo.renda > 0 && (
              <span className="cf-dash__detalhe">
                {formatarPercentual(resumo.percentual_renda_gasto)} da renda
              </span>
            )}
          </span>
        }
      />
      <StatCard
        rotulo="Saldo"
        valor={resumo.saldo}
        tomValor={resumo.saldo >= 0 ? "positivo" : "negativo"}
        carregando={carregando}
        detalhe={<Variacao dados={comparar("saldo")} inverter />}
      />
      <StatCard
        rotulo="Taxa de economia"
        valor={resumo.saldo}
        carregando={carregando}
        detalhe={<VariacaoPontos dados={comparar("taxa_economia")} />}
        // A taxa é um percentual, não um valor: o StatCard exibe moeda, então
        // o número percentual entra como conteúdo próprio.
        conteudo={
          resumo.renda > 0 ? formatarPercentual(resumo.taxa_economia) : "—"
        }
      />
    </Grid>
  );
}

/**
 * Variação percentual entre períodos.
 *
 * `inverter` existe porque a leitura muda com a métrica: gastar mais é ruim,
 * receber mais é bom. A cor segue o significado, não o sinal aritmético.
 */
function Variacao({ dados, inverter = false }) {
  if (!dados || dados.variacao_percentual === null) return null;

  const valor = dados.variacao_percentual;

  if (valor === 0) {
    return (
      <span className="cf-variacao cf-variacao--neutra">
        <FiMinus aria-hidden="true" /> igual ao mês anterior
      </span>
    );
  }

  const subiu = valor > 0;
  const bom = inverter ? subiu : !subiu;
  const Icone = subiu ? FiArrowUp : FiArrowDown;

  return (
    <span className={`cf-variacao ${bom ? "cf-variacao--boa" : "cf-variacao--ruim"}`}>
      <Icone aria-hidden="true" />
      {formatarPercentual(Math.abs(valor))} vs. mês anterior
      <span className="cf-sr-only">
        ({formatarMoeda(Math.abs(dados.variacao_absoluta))} de diferença)
      </span>
    </span>
  );
}

/** Percentual comparado com percentual se lê em pontos percentuais. */
function VariacaoPontos({ dados }) {
  if (!dados || dados.variacao_pontos === null || dados.variacao_pontos === 0) {
    return null;
  }

  const subiu = dados.variacao_pontos > 0;
  const Icone = subiu ? FiArrowUp : FiArrowDown;

  return (
    <span className={`cf-variacao ${subiu ? "cf-variacao--boa" : "cf-variacao--ruim"}`}>
      <Icone aria-hidden="true" />
      {Math.abs(dados.variacao_pontos).toString().replace(".", ",")} p.p. vs. mês anterior
    </span>
  );
}
