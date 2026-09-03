import { Badge, Card, Money, ProgressBar } from "../../../components/ui";
import { formatarMoeda, formatarPercentual } from "../../../lib/format";
import "./dashboard.css";

const TOM_DA_FAIXA = {
  necessidade: "necessidade",
  desejo: "desejo",
  poupanca: "poupanca",
};

const ROTULO_DO_STATUS = {
  dentro_do_limite: { texto: "Dentro do limite", tom: "positivo" },
  atencao:          { texto: "Perto do limite", tom: "atencao" },
  acima_do_limite:  { texto: "Acima do limite", tom: "negativo" },
  meta_atingida:    { texto: "Meta atingida", tom: "positivo" },
  proximo_da_meta:  { texto: "Perto da meta", tom: "atencao" },
  abaixo_da_meta:   { texto: "Abaixo da meta", tom: "neutro" },
  sem_renda:        { texto: "Sem renda", tom: "neutro" },
};

/**
 * Regra 50/30/20, com o backend como única fonte da verdade.
 *
 * Nada é recalculado aqui: gasto, limite, percentual, diferença e status vêm
 * prontos. A barra satura em 100% (o componente cuida disso), mas o excesso
 * continua visível no texto — esconder que estourou seria justamente o erro.
 */
export default function RegraCincoTrintaVinte({ regra, semRenda, percentualUtilizado }) {
  return (
    <Card
      titulo="Regra 50/30/20"
      descricao={
        semRenda
          ? "Cadastre a renda do período para ver os limites."
          : "Quanto de cada faixa você já usou."
      }
    >
      <div className="cf-regra">
        {regra.faixas.map((faixa) => {
          const status = ROTULO_DO_STATUS[faixa.status] ?? ROTULO_DO_STATUS.sem_renda;
          const estourou = faixa.status === "acima_do_limite";
          const ehMeta = faixa.tipo === "poupanca";

          return (
            <div key={faixa.tipo} className="cf-regra__faixa">
              <div className="cf-regra__cabecalho">
                <div className="cf-regra__identidade">
                  <span className="cf-regra__nome">{faixa.rotulo}</span>
                  <span className="cf-regra__percentual-regra">
                    {Math.round(faixa.percentual_regra * 100)}%
                  </span>
                </div>
                <Badge tom={status.tom} ponto>{status.texto}</Badge>
              </div>

              <div className="cf-regra__valores">
                <Money valor={faixa.gasto} tamanho="md" />
                <span className="cf-regra__limite">
                  de {formatarMoeda(faixa.limite)}
                </span>
              </div>

              <ProgressBar
                valor={faixa.percentual}
                tom={TOM_DA_FAIXA[faixa.tipo]}
                mostrarPercentual={!semRenda}
                rotuloVisivel={false}
                rotulo={`${faixa.rotulo}: ${formatarMoeda(faixa.gasto)} de ${formatarMoeda(faixa.limite)}`}
              />

              {!semRenda && (
                <p className={`cf-regra__saldo ${estourou ? "cf-regra__saldo--estouro" : ""}`}>
                  {estourou
                    ? `${formatarMoeda(Math.abs(faixa.diferenca))} acima do recomendado`
                    : ehMeta
                      ? `Faltam ${formatarMoeda(faixa.diferenca)} para a meta`
                      : `Ainda pode gastar ${formatarMoeda(faixa.diferenca)}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!semRenda && (
        <p className="cf-regra__rodape">
          Sobre a renda de {formatarMoeda(regra.renda)} ·{" "}
          {formatarPercentual(percentualUtilizado)} utilizada
        </p>
      )}
    </Card>
  );
}
