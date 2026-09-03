import { FiInfo, FiTrendingUp } from "react-icons/fi";
import { Badge, Button, Card, Money, ProgressBar } from "../../../components/ui";
import { formatarMoeda } from "../../../lib/format";
import "./dashboard.css";

const TOM_DO_RITMO = {
  acelerado: "negativo",
  equilibrado: "positivo",
  folgado: "positivo",
};

const ROTULO_DO_RITMO = {
  acelerado: "Ritmo acelerado",
  equilibrado: "No ritmo",
  folgado: "Abaixo do ritmo",
};

/**
 * "Quanto posso gastar?" — a pergunta mais prática do produto.
 *
 * O valor sai do backend já descontando a parte da renda que deveria ir para a
 * poupança: dizer que sobram R$ 900 quando R$ 400 são da reserva seria enganoso.
 *
 * Quando não há base, o card explica o motivo. Nunca mostra R$ 0,00 como se
 * fosse uma recomendação de gasto.
 */
export default function CartaoCapacidade({ capacidade, ritmo, onAdicionarRenda }) {
  if (!capacidade.disponivel) {
    return (
      <Card titulo="Quanto posso gastar?">
        <div className="cf-capacidade__indisponivel">
          <FiInfo aria-hidden="true" />
          <p>{capacidade.mensagem}</p>
        </div>

        {capacidade.motivo === "sem_renda" && onAdicionarRenda && (
          <Button variante="secundario" tamanho="sm" onClick={onAdicionarRenda}>
            Adicionar renda
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card titulo="Quanto posso gastar?">
      <div className="cf-capacidade">
        <span className="cf-capacidade__chamada">Você pode gastar até</span>

        <Money valor={capacidade.por_dia} tamanho="xl" tom="padrao" />

        <span className="cf-capacidade__unidade">por dia</span>

        <p className="cf-capacidade__contexto">
          {formatarMoeda(capacidade.valor_disponivel)} disponíveis em{" "}
          {capacidade.dias_restantes}{" "}
          {capacidade.dias_restantes === 1 ? "dia restante" : "dias restantes"}
          {capacidade.reservado_poupanca > 0 && (
            <>
              , já reservando {formatarMoeda(capacidade.reservado_poupanca)} para a
              poupança
            </>
          )}
          .
        </p>
      </div>

      {ritmo?.disponivel && (
        <div className="cf-ritmo">
          <div className="cf-ritmo__topo">
            <span className="cf-ritmo__titulo">
              <FiTrendingUp aria-hidden="true" /> Ritmo de gastos
            </span>
            <Badge tom={TOM_DO_RITMO[ritmo.status] ?? "neutro"} ponto>
              {ROTULO_DO_RITMO[ritmo.status]}
            </Badge>
          </div>

          <ProgressBar
            rotulo="Renda utilizada"
            valor={ritmo.percentual_gasto}
            tom={ritmo.status === "acelerado" ? "negativo" : "positivo"}
            tamanho="sm"
          />
          <ProgressBar
            rotulo="Do mês decorrido"
            valor={ritmo.percentual_periodo}
            tom="marca"
            tamanho="sm"
          />

          <p className="cf-ritmo__mensagem">{ritmo.mensagem}</p>
        </div>
      )}

      <p className="cf-capacidade__ressalva">{capacidade.ressalva}</p>
    </Card>
  );
}
