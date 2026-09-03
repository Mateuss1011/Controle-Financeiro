import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiDownload, FiInfo } from "react-icons/fi";
import { Button, ErrorState, Skeleton, useToast } from "../../components/ui";
import { Grid, PageHeader, Stack } from "../../components/layout";
import { useAuth } from "../auth/authContext";
import { useDashboard } from "./useDashboard";
import AvisoSemRenda from "./componentes/AvisoSemRenda";
import CartaoCapacidade from "./componentes/CartaoCapacidade";
import CartaoSaude from "./componentes/CartaoSaude";
import GastosPorCategoria from "./componentes/GastosPorCategoria";
import Insights from "./componentes/Insights";
import PrimeiraSessao from "./componentes/PrimeiraSessao";
import RegraCincoTrintaVinte from "./componentes/RegraCincoTrintaVinte";
import ResumoFinanceiro from "./componentes/ResumoFinanceiro";
import SeletorCompetencia from "./componentes/SeletorCompetencia";
import UltimosLancamentos from "./componentes/UltimosLancamentos";
import "./componentes/dashboard.css";

function saudacao() {
  const hora = new Date().getHours();

  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";

  return "Boa noite";
}

/**
 * Dashboard.
 *
 * Uma requisição, uma competência, uma verdade. Todos os números vêm prontos do
 * backend — aqui só se formata e organiza. A ordem das seções segue a ordem das
 * perguntas do usuário: quanto tenho, quanto posso gastar, o que merece
 * atenção, como estou, onde gastei.
 */
export default function DashboardPage() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  // Nula na primeira carga: o servidor escolhe a competência mais recente com
  // dados. A partir daí o seletor manda.
  const [competencia, setCompetencia] = useState(null);
  const [exportando, setExportando] = useState(false);
  const areaImpressa = useRef(null);

  const { dados, carregando, erro, recarregar } = useDashboard(competencia);

  const irParaLancamentos = () => navegar("/controle");

  /**
   * jsPDF e html2canvas só são baixados quando o usuário clica: juntos passam
   * de 180 kB e não fazem falta para quem só quer ver o painel.
   */
  async function exportarPDF() {
    if (!areaImpressa.current) return;

    setExportando(true);

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const canvas = await html2canvas(areaImpressa.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const larguraPagina = pdf.internal.pageSize.getWidth();
      const alturaPagina = pdf.internal.pageSize.getHeight();
      const largura = larguraPagina - 20;
      const altura = (canvas.height * largura) / canvas.width;

      pdf.setFontSize(14);
      pdf.text(`Resumo financeiro — ${dados.competencia_rotulo}`, larguraPagina / 2, 12, {
        align: "center",
      });
      pdf.setLineWidth(0.3);
      pdf.line(10, 15, larguraPagina - 10, 15);
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 20, largura, altura);

      pdf.setFontSize(9);
      pdf.text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
        larguraPagina / 2,
        alturaPagina - 10,
        { align: "center" }
      );

      pdf.save(`controle-financeiro-${dados.competencia}.pdf`);
      toast.sucesso("PDF gerado com sucesso.");
    } catch {
      toast.erro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExportando(false);
    }
  }

  if (erro) {
    return (
      <>
        <PageHeader titulo="Dashboard" />
        <ErrorState
          titulo="Não foi possível carregar seu painel"
          descricao={erro.mensagem}
          onTentarNovamente={recarregar}
        />
      </>
    );
  }

  if (carregando && !dados) {
    return <EsqueletoDoPainel />;
  }

  if (!dados) return null;

  const semRenda = dados.resumo.renda <= 0;
  const primeiroNome = (usuario?.name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        titulo={primeiroNome ? `${saudacao()}, ${primeiroNome}` : "Dashboard"}
        descricao={`Visão de ${dados.competencia_rotulo}`}
        acoes={
          <>
            <SeletorCompetencia
              valor={dados.competencia}
              competencias={dados.competencias_com_dados}
              onMudar={setCompetencia}
              desabilitado={carregando}
            />
            <Button
              variante="secundario"
              onClick={exportarPDF}
              carregando={exportando}
              iconeEsquerda={<FiDownload />}
              disabled={!dados.tem_dados}
            >
              Exportar PDF
            </Button>
          </>
        }
      />

      {/* Primeira sessão: nada de parede de zeros. */}
      {dados.primeira_sessao ? (
        <PrimeiraSessao
          onAdicionarRenda={irParaLancamentos}
          onAdicionarLancamento={irParaLancamentos}
        />
      ) : (
        <div ref={areaImpressa}>
          <Stack gap="var(--cf-esp-5)">
            {dados.competencia_ajustada && (
              <div className="cf-aviso cf-aviso--info" role="status">
                <FiInfo aria-hidden="true" />
                <div className="cf-aviso__texto">
                  <p className="cf-aviso__titulo">
                    Mostrando {dados.competencia_rotulo}
                  </p>
                  <p className="cf-aviso__descricao">
                    É o período mais recente com lançamentos. Use o seletor para
                    ver outro mês.
                  </p>
                </div>
              </div>
            )}

            {semRenda && !dados.primeira_sessao && (
              <AvisoSemRenda
                competenciaRotulo={dados.competencia_rotulo}
                onAdicionarRenda={irParaLancamentos}
              />
            )}

            <ResumoComCarregamento dados={dados} carregando={carregando} />

            <Grid minimo="320px" gap="var(--cf-esp-5)">
              <CartaoCapacidade
                capacidade={dados.capacidade}
                ritmo={dados.ritmo}
                onAdicionarRenda={irParaLancamentos}
              />
              <Insights insights={dados.insights} />
            </Grid>

            <Grid minimo="320px" gap="var(--cf-esp-5)">
              <CartaoSaude saude={dados.saude} onAdicionarRenda={irParaLancamentos} />
              <RegraCincoTrintaVinte
                regra={dados.regra}
                semRenda={semRenda}
                percentualUtilizado={dados.resumo.percentual_renda_gasto}
              />
            </Grid>

            <Grid minimo="320px" gap="var(--cf-esp-5)">
              <GastosPorCategoria
                categorias={dados.categorias}
                total={dados.resumo.gastos}
                competencia={dados.competencia}
              />
              <UltimosLancamentos
                lancamentos={dados.ultimos_lancamentos}
                onVerTodos={irParaLancamentos}
                onAdicionar={irParaLancamentos}
              />
            </Grid>
          </Stack>
        </div>
      )}
    </>
  );
}

function ResumoComCarregamento({ dados, carregando }) {
  return (
    <ResumoFinanceiro
      resumo={dados.resumo}
      comparacao={dados.comparacao}
      carregando={carregando}
    />
  );
}

function EsqueletoDoPainel() {
  return (
    <>
      <PageHeader titulo="Carregando seu painel…" />
      <Stack gap="var(--cf-esp-5)">
        <Grid minimo="210px">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cf-stat">
              <Skeleton largura="45%" altura="12px" />
              <Skeleton largura="70%" altura="26px" />
            </div>
          ))}
        </Grid>
        <Grid minimo="320px" gap="var(--cf-esp-5)">
          {[1, 2].map((i) => (
            <div key={i} className="cf-card" style={{ padding: "var(--cf-esp-5)" }}>
              <Skeleton largura="40%" altura="16px" />
              <div style={{ height: "var(--cf-esp-4)" }} />
              <Skeleton altura="90px" />
            </div>
          ))}
        </Grid>
      </Stack>
    </>
  );
}
