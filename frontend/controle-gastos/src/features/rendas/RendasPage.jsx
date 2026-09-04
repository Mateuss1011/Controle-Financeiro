import { useState } from "react";
import { FiAlertCircle, FiPlus, FiTrendingUp } from "react-icons/fi";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  Money,
  StatCard,
  useToast,
} from "../../components/ui";
import { Grid, PageHeader, Stack } from "../../components/layout";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";
import { formatarCompetencia } from "../../lib/format";
import { useLancamentosGlobais } from "../lancamentos/lancamentosContext";
import FormularioRenda from "./componentes/FormularioRenda";
import ListaRendas from "./componentes/ListaRendas";
import { useRendas } from "./useRendas";
import "./componentes/rendas.css";

/**
 * Renda como funcionalidade de primeira classe.
 *
 * Antes isto era um único campo "salário mensal" que sempre gravava o mês
 * corrente. Agora há histórico por competência, registro de qualquer mês,
 * edição, exclusão e a leitura que importa em primeiro lugar: qual renda está
 * valendo agora.
 */
export default function RendasPage() {
  const toast = useToast();
  // Mudança de renda altera limites e saúde financeira: o mesmo sinal que os
  // lançamentos usam mantém o Dashboard em dia.
  const { notificarMudanca } = useLancamentosGlobais();

  const [versao, setVersao] = useState(0);
  const [formulario, setFormulario] = useState({ aberto: false, renda: null });
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const { rendas, resumo, carregando, erro, recarregar } = useRendas(versao);

  const recarregarTudo = () => {
    setVersao((v) => v + 1);
    notificarMudanca();
  };

  const abrirNova = () => setFormulario({ aberto: true, renda: null });
  const abrirEdicao = (renda) => setFormulario({ aberto: true, renda });
  const fechar = () => setFormulario({ aberto: false, renda: null });

  function aoSalvar(mensagem) {
    fechar();
    recarregarTudo();
    toast.sucesso(mensagem);
  }

  async function confirmarExclusao() {
    setExcluindo(true);

    try {
      await api.delete(`/rendas/${paraExcluir.id}`);
      setParaExcluir(null);
      recarregarTudo();
      toast.sucesso("Renda excluída.");
    } catch (error) {
      toast.erro(extrairErro(error).mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  if (erro) {
    return (
      <>
        <PageHeader titulo="Renda" />
        <ErrorState
          titulo="Não foi possível carregar suas rendas"
          descricao={erro.mensagem}
          onTentarNovamente={recarregar}
        />
      </>
    );
  }

  const semRendas = !carregando && rendas.length === 0;

  return (
    <>
      <PageHeader
        titulo="Renda"
        descricao="Quanto você recebeu em cada período. É a base dos limites da regra 50/30/20 e da sua saúde financeira."
        acoes={
          <Button onClick={abrirNova} iconeEsquerda={<FiPlus />}>
            Registrar renda
          </Button>
        }
      />

      <Stack gap="var(--cf-esp-5)">
        {/* A pergunta que se faz primeiro nesta tela: qual renda vale agora? */}
        {!semRendas && (
          <Grid minimo="240px">
            <StatCard
              rotulo={
                resumo?.competencia_atual
                  ? `Renda de ${formatarCompetencia(resumo.competencia_atual)}`
                  : "Renda do período atual"
              }
              valor={resumo?.renda_atual ?? 0}
              conteudo={resumo?.tem_renda_atual ? undefined : "Não registrada"}
              tomValor={resumo?.tem_renda_atual ? "padrao" : "suave"}
              destaque
              carregando={carregando}
              detalhe={
                resumo?.tem_renda_atual
                  ? "É esta que vale nos cálculos do mês"
                  : "Os cálculos deste mês ficam sem base"
              }
            />
            <StatCard
              rotulo="Média dos últimos 12 meses"
              valor={resumo?.media_12_meses ?? 0}
              conteudo={resumo?.media_12_meses == null ? "—" : undefined}
              carregando={carregando}
              icone={<FiTrendingUp />}
              detalhe="Ajuda a planejar quando a renda varia"
            />
            <StatCard
              rotulo="Períodos registrados"
              valor={0}
              conteudo={String(resumo?.total_registros ?? 0)}
              carregando={carregando}
              detalhe="Uma renda por competência"
            />
          </Grid>
        )}

        {/* Sem renda no mês corrente, o resto do produto fica sem base. */}
        {!carregando && !semRendas && !resumo?.tem_renda_atual && (
          <div className="cf-aviso cf-aviso--atencao" role="status">
            <FiAlertCircle aria-hidden="true" />
            <div className="cf-aviso__texto">
              <p className="cf-aviso__titulo">
                {formatarCompetencia(resumo?.competencia_atual)} ainda não tem renda registrada
              </p>
              <p className="cf-aviso__descricao">
                Sem ela, este período fica sem limites da regra 50/30/20, sem taxa
                de economia e sem saúde financeira.
              </p>
            </div>
            <Button variante="secundario" tamanho="sm" onClick={abrirNova}>
              Registrar agora
            </Button>
          </div>
        )}

        <Card
          titulo="Histórico"
          descricao={semRendas ? undefined : "Uma renda por competência, da mais recente para a mais antiga."}
          semPadding={!semRendas}
        >
          {semRendas ? (
            <EmptyState
              icone={<FiTrendingUp />}
              titulo="Você ainda não registrou nenhuma renda"
              descricao="Cadastre quanto recebeu no mês para o Controle Financeiro calcular seus limites e acompanhar sua saúde financeira."
              acaoRotulo="Registrar renda"
              onAcao={abrirNova}
            />
          ) : (
            <ListaRendas
              rendas={rendas}
              resumo={resumo}
              carregando={carregando}
              onEditar={abrirEdicao}
              onExcluir={setParaExcluir}
            />
          )}
        </Card>
      </Stack>

      <FormularioRenda
        aberto={formulario.aberto}
        renda={formulario.renda}
        rendasExistentes={rendas}
        onFechar={fechar}
        onSalvo={aoSalvar}
      />

      <Modal
        aberto={Boolean(paraExcluir)}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir renda"
        rotuloConfirmar="Excluir"
        varianteConfirmar="perigo"
        onConfirmar={confirmarExclusao}
        confirmando={excluindo}
      >
        <p>
          Tem certeza que deseja excluir a renda de{" "}
          <strong>{formatarCompetencia(paraExcluir?.competencia)}</strong>, de{" "}
          <Money valor={paraExcluir?.valor ?? 0} tamanho="sm" />?
        </p>
        <p className="cf-lancamentos__aviso-exclusao">
          A competência ficará sem renda: os limites da regra 50/30/20, a taxa de
          economia e a saúde financeira desse período deixam de ser calculados.
          Os lançamentos do período não são afetados.
        </p>
      </Modal>
    </>
  );
}
