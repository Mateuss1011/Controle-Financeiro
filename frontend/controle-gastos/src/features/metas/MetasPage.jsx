import { useState } from "react";
import { FiPlus, FiTarget } from "react-icons/fi";
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
import { formatarMoeda, percentualSeguro } from "../../lib/format";
import { useLancamentosGlobais } from "../lancamentos/lancamentosContext";
import FormularioAporte from "./componentes/FormularioAporte";
import FormularioMeta from "./componentes/FormularioMeta";
import ListaMetas from "./componentes/ListaMetas";
import { useMetas } from "./useMetas";
import "./componentes/metas.css";

export default function MetasPage() {
  const toast = useToast();
  // Meta com prazo entra na estimativa de "quanto posso gastar": mexer aqui
  // precisa repercutir no Dashboard.
  const { notificarMudanca, versao: versaoGlobal } = useLancamentosGlobais();

  const [versao, setVersao] = useState(0);
  const [formulario, setFormulario] = useState({ aberto: false, meta: null });
  const [paraAportar, setParaAportar] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const { metas, resumo, carregando, erro, recarregar } = useMetas(versao + versaoGlobal);

  const recarregarTudo = () => {
    setVersao((v) => v + 1);
    notificarMudanca();
  };

  const abrirNova = () => setFormulario({ aberto: true, meta: null });
  const abrirEdicao = (meta) => setFormulario({ aberto: true, meta });
  const fechar = () => setFormulario({ aberto: false, meta: null });

  function aoSalvar(mensagem) {
    fechar();
    setParaAportar(null);
    recarregarTudo();
    toast.sucesso(mensagem);
  }

  async function confirmarExclusao() {
    setExcluindo(true);

    try {
      await api.delete(`/metas/${paraExcluir.id}`);
      setParaExcluir(null);
      recarregarTudo();
      toast.sucesso("Meta excluída.");
    } catch (error) {
      toast.erro(extrairErro(error).mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  if (erro) {
    return (
      <>
        <PageHeader titulo="Metas" />
        <ErrorState
          titulo="Não foi possível carregar suas metas"
          descricao={erro.mensagem}
          onTentarNovamente={recarregar}
        />
      </>
    );
  }

  const semMetas = !carregando && metas.length === 0;
  const progressoGeral = percentualSeguro(
    resumo?.total_acumulado ?? 0,
    resumo?.total_objetivo ?? 0
  );

  return (
    <>
      <PageHeader
        titulo="Metas"
        descricao="Seus objetivos e quanto falta para alcançar cada um."
        acoes={
          <Button onClick={abrirNova} iconeEsquerda={<FiPlus />}>
            Nova meta
          </Button>
        }
      />

      <Stack gap="var(--cf-esp-5)">
        {!semMetas && (
          <>
            <Grid minimo="240px">
              <StatCard
                rotulo="Total das metas"
                valor={resumo?.total_objetivo ?? 0}
                destaque
                carregando={carregando}
                detalhe={`${resumo?.quantidade ?? 0} ${
                  (resumo?.quantidade ?? 0) === 1 ? "meta" : "metas"
                }${(resumo?.concluidas ?? 0) > 0 ? `, ${resumo.concluidas} concluída${resumo.concluidas > 1 ? "s" : ""}` : ""}`}
              />
              <StatCard
                rotulo="Já guardado"
                valor={resumo?.total_acumulado ?? 0}
                tomValor="positivo"
                carregando={carregando}
                detalhe={`Faltam ${formatarMoeda(resumo?.total_restante ?? 0)}`}
              />
              <StatCard
                rotulo="Aporte mensal necessário"
                valor={resumo?.compromisso_mensal ?? 0}
                carregando={carregando}
                detalhe={
                  (resumo?.compromisso_mensal ?? 0) > 0
                    ? "Somando as metas com prazo"
                    : "Nenhuma meta com prazo em aberto"
                }
              />
            </Grid>

            {!carregando && (
              <Card titulo="Progresso geral">
                <ProgressBar
                  valor={progressoGeral}
                  tom="marca"
                  rotulo="Total guardado sobre o total das metas"
                />
                <p className="cf-metas__ressalva">
                  O aporte mensal é uma estimativa aritmética — o que falta dividido
                  pelos meses até o prazo — calculada a partir dos dados que você
                  registrou. Não é recomendação financeira.
                </p>
              </Card>
            )}
          </>
        )}

        <Card
          titulo="Suas metas"
          descricao={
            semMetas ? undefined : "Do prazo mais próximo para o mais distante; concluídas por último."
          }
          semPadding={!semMetas}
        >
          {semMetas ? (
            <EmptyState
              icone={<FiTarget />}
              titulo="Você ainda não tem metas"
              descricao="Defina um objetivo — uma reserva de emergência, uma viagem, uma troca de equipamento. Com prazo, o Controle Financeiro calcula quanto guardar por mês e considera isso na estimativa de quanto você pode gastar."
              acaoRotulo="Criar primeira meta"
              onAcao={abrirNova}
            />
          ) : (
            <ListaMetas
              metas={metas}
              carregando={carregando}
              onAportar={setParaAportar}
              onEditar={abrirEdicao}
              onExcluir={setParaExcluir}
            />
          )}
        </Card>
      </Stack>

      <FormularioMeta
        aberto={formulario.aberto}
        meta={formulario.meta}
        onFechar={fechar}
        onSalvo={aoSalvar}
      />

      <FormularioAporte
        aberto={Boolean(paraAportar)}
        meta={paraAportar}
        onFechar={() => setParaAportar(null)}
        onSalvo={aoSalvar}
      />

      <Modal
        aberto={Boolean(paraExcluir)}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir meta"
        rotuloConfirmar="Excluir"
        varianteConfirmar="perigo"
        onConfirmar={confirmarExclusao}
        confirmando={excluindo}
      >
        <p>
          Tem certeza que deseja excluir a meta <strong>{paraExcluir?.nome}</strong>,
          de <Money valor={paraExcluir?.valor_objetivo ?? 0} tamanho="sm" />?
        </p>
        <p className="cf-lancamentos__aviso-exclusao">
          {paraExcluir?.aporte_mensal > 0
            ? `O aporte de ${formatarMoeda(paraExcluir.aporte_mensal)} por mês deixa de ser considerado na estimativa de quanto você pode gastar. `
            : ""}
          Os lançamentos e a sua saúde financeira não são afetados.
        </p>
      </Modal>
    </>
  );
}
