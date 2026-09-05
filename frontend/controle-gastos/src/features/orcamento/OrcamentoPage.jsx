import { useState } from "react";
import { FiPieChart, FiPlus } from "react-icons/fi";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  Money,
  ProgressBar,
  StatCard,
  useToast,
} from "../../components/ui";
import { Grid, PageHeader, Stack } from "../../components/layout";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";
import { competenciaAtual, formatarCompetencia, formatarPercentual } from "../../lib/format";
import SeletorCompetencia from "../dashboard/componentes/SeletorCompetencia";
import { useLancamentosGlobais } from "../lancamentos/lancamentosContext";
import FormularioOrcamento from "./componentes/FormularioOrcamento";
import ListaOrcamentos from "./componentes/ListaOrcamentos";
import { useOrcamentos } from "./useOrcamentos";
import "./componentes/orcamento.css";

export default function OrcamentoPage() {
  const toast = useToast();
  // Orçamento entra no cálculo da saúde financeira: mexer aqui precisa
  // repercutir no Dashboard.
  const { notificarMudanca, versao: versaoGlobal } = useLancamentosGlobais();

  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [versao, setVersao] = useState(0);
  const [formulario, setFormulario] = useState({ aberto: false, orcamento: null });
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const { orcamentos, resumo, carregando, erro, recarregar } = useOrcamentos(
    competencia,
    versao + versaoGlobal
  );

  const recarregarTudo = () => {
    setVersao((v) => v + 1);
    notificarMudanca();
  };

  const abrirNovo = () => setFormulario({ aberto: true, orcamento: null });
  const abrirEdicao = (orcamento) => setFormulario({ aberto: true, orcamento });
  const fechar = () => setFormulario({ aberto: false, orcamento: null });

  function aoSalvar(mensagem) {
    fechar();
    recarregarTudo();
    toast.sucesso(mensagem);
  }

  async function confirmarExclusao() {
    setExcluindo(true);

    try {
      await api.delete(`/orcamentos/${paraExcluir.id}`);
      setParaExcluir(null);
      recarregarTudo();
      toast.sucesso("Orçamento excluído.");
    } catch (error) {
      toast.erro(extrairErro(error).mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  if (erro) {
    return (
      <>
        <PageHeader titulo="Orçamento" />
        <ErrorState
          titulo="Não foi possível carregar seus orçamentos"
          descricao={erro.mensagem}
          onTentarNovamente={recarregar}
        />
      </>
    );
  }

  const semOrcamentos = !carregando && orcamentos.length === 0;

  return (
    <>
      <PageHeader
        titulo="Orçamento"
        descricao="Limites por categoria e quanto de cada um você já usou."
        acoes={
          <>
            <SeletorCompetencia
              valor={competencia}
              competencias={[competencia]}
              onMudar={setCompetencia}
              desabilitado={carregando}
            />
            <Button onClick={abrirNovo} iconeEsquerda={<FiPlus />}>
              Novo orçamento
            </Button>
          </>
        }
      />

      <Stack gap="var(--cf-esp-5)">
        {!semOrcamentos && (
          <>
            <Grid minimo="240px">
              <StatCard
                rotulo="Total orçado"
                valor={resumo?.limite ?? 0}
                destaque
                carregando={carregando}
                detalhe={`${resumo?.quantidade ?? 0} ${
                  (resumo?.quantidade ?? 0) === 1 ? "categoria" : "categorias"
                } com limite`}
              />
              <StatCard
                rotulo="Já gasto"
                valor={resumo?.gasto ?? 0}
                tomValor={(resumo?.gasto ?? 0) > 0 ? "negativo" : "padrao"}
                carregando={carregando}
                detalhe={
                  <span className="cf-dash__detalhe">
                    {formatarPercentual(resumo?.percentual ?? 0)} do orçado
                  </span>
                }
              />
              <StatCard
                rotulo="Disponível"
                valor={resumo?.restante ?? 0}
                tomValor={(resumo?.restante ?? 0) >= 0 ? "positivo" : "negativo"}
                carregando={carregando}
                detalhe={
                  (resumo?.estourados ?? 0) > 0
                    ? `${resumo.estourados} ${resumo.estourados === 1 ? "categoria estourada" : "categorias estouradas"}`
                    : "Nenhuma categoria estourada"
                }
              />
            </Grid>

            {!carregando && (
              <Card titulo={`Uso do orçamento em ${formatarCompetencia(competencia)}`}>
                <ProgressBar
                  valor={resumo?.percentual ?? 0}
                  tom={(resumo?.restante ?? 0) < 0 ? "negativo" : "marca"}
                  rotulo="Total gasto sobre o total orçado"
                />
              </Card>
            )}
          </>
        )}

        <Card
          titulo="Limites por categoria"
          descricao={
            semOrcamentos ? undefined : "Da categoria mais consumida para a menos."
          }
          semPadding={!semOrcamentos}
        >
          {semOrcamentos ? (
            <EmptyState
              icone={<FiPieChart />}
              titulo="Você ainda não definiu nenhum orçamento"
              descricao="Escolha um limite mensal para as categorias que você quer controlar de perto. O Controle Financeiro avisa quando o gasto se aproximar do teto."
              acaoRotulo="Definir primeiro orçamento"
              onAcao={abrirNovo}
            />
          ) : (
            <ListaOrcamentos
              orcamentos={orcamentos}
              carregando={carregando}
              onEditar={abrirEdicao}
              onExcluir={setParaExcluir}
            />
          )}
        </Card>
      </Stack>

      <FormularioOrcamento
        aberto={formulario.aberto}
        orcamento={formulario.orcamento}
        competencia={competencia}
        jaOrcadas={orcamentos}
        onFechar={fechar}
        onSalvo={aoSalvar}
      />

      <Modal
        aberto={Boolean(paraExcluir)}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir orçamento"
        rotuloConfirmar="Excluir"
        varianteConfirmar="perigo"
        onConfirmar={confirmarExclusao}
        confirmando={excluindo}
      >
        <p>
          Tem certeza que deseja excluir o orçamento de{" "}
          <strong>{paraExcluir?.categoria}</strong>, de{" "}
          <Money valor={paraExcluir?.limite ?? 0} tamanho="sm" />?
        </p>
        <p className="cf-lancamentos__aviso-exclusao">
          A categoria deixa de ter limite e sai do cálculo de cumprimento de
          orçamentos da sua saúde financeira. Os lançamentos não são afetados.
        </p>
      </Modal>
    </>
  );
}
