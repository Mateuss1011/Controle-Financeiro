import { FiInfo, FiLock, FiTrendingUp } from "react-icons/fi";
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
 * O que fica de fora do "posso gastar", e por quê.
 *
 * Duas fontes disputam essa reserva — os 20% da regra 50/30/20 e o aporte
 * mensal das metas com prazo. Elas medem a mesma coisa por caminhos diferentes:
 * dinheiro guardado. Somá-las contaria o mesmo real duas vezes, então reserva-se
 * o MAIOR dos dois.
 *
 * Quando as metas prevalecem, o bloco mostra os dois números lado a lado. Uma
 * meta explícita não pode encolher o "posso gastar" em silêncio — o usuário
 * precisa ver que foi ela, e não a regra, que mandou.
 */
function Reserva({ reserva }) {
  if (!reserva || reserva.aplicada <= 0) return null;

  return (
    <div
      className={`cf-reserva ${reserva.metas_prevalecem ? "cf-reserva--metas" : ""}`}
    >
      <div className="cf-reserva__topo">
        <span className="cf-reserva__titulo">
          <FiLock aria-hidden="true" /> Reservado neste mês
        </span>
        <strong className="cf-reserva__valor">
          {formatarMoeda(reserva.aplicada)}
        </strong>
      </div>

      {reserva.metas_prevalecem && (
        <dl className="cf-reserva__comparacao">
          <div>
            <dt>Suas metas com prazo</dt>
            <dd>{formatarMoeda(reserva.compromisso_metas)}/mês</dd>
          </div>
          <div>
            <dt>Regra 50/30/20</dt>
            <dd>{formatarMoeda(reserva.meta_regra)}/mês</dd>
          </div>
        </dl>
      )}

      <p className="cf-reserva__explicacao">{reserva.explicacao}</p>
    </div>
  );
}

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

        {/* Sem folga ainda tem reserva: mostrar o que a consumiu explica o
            "R$ 0 disponíveis" melhor do que qualquer frase. */}
        <Reserva reserva={capacidade.reserva} />

        <p className="cf-capacidade__ressalva">{capacidade.ressalva}</p>
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
            <>, já reservando {formatarMoeda(capacidade.reservado_poupanca)}</>
          )}
          .
        </p>
      </div>

      <Reserva reserva={capacidade.reserva} />

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
