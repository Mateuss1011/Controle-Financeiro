import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiBarChart2, FiDownload, FiFileText, FiInfo } from "react-icons/fi";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StatCard,
  useToast,
} from "../../components/ui";
import { Grid, PageHeader, Stack } from "../../components/layout";
import { baixarCsv, montarCsv, numeroParaCsv } from "../../lib/csv";
import { formatarCompetencia, formatarMoeda, formatarPercentual } from "../../lib/format";
import { useLancamentosGlobais } from "../lancamentos/lancamentosContext";
import ComposicaoRegra from "./componentes/ComposicaoRegra";
import DestaquesPeriodo from "./componentes/DestaquesPeriodo";
import EvolucaoMensal from "./componentes/EvolucaoMensal";
import RankingCategorias from "./componentes/RankingCategorias";
import TabelaMensal from "./componentes/TabelaMensal";
import SeletorIntervalo from "./componentes/SeletorIntervalo";
import { useRelatorio } from "./useRelatorio";
import "./componentes/relatorios.css";

/**
 * Relatórios.
 *
 * O Dashboard responde "como estou este mês". Aqui a pergunta é "para onde isso
 * está indo" — mesma metodologia, eixo do tempo. Todos os números vêm prontos
 * do backend; esta tela formata e organiza.
 *
 * O intervalo mora na URL: um relatório é a coisa que mais se manda para alguém
 * ou se guarda nos favoritos, e um link que abre outro período não serve.
 */
export default function RelatoriosPage() {
  const toast = useToast();
  const [parametros, setParametros] = useSearchParams();
  // Qualquer lançamento criado ou editado em outra tela muda o relatório.
  const { versao } = useLancamentosGlobais();

  const de = parametros.get("de");
  const ate = parametros.get("ate");

  const [exportando, setExportando] = useState(false);
  const areaImpressa = useRef(null);

  const { dados, carregando, erro, recarregar } = useRelatorio(de, ate, versao);

  function mudarIntervalo({ de: novoDe, ate: novoAte }) {
    const proximos = new URLSearchParams(parametros);

    if (novoDe) proximos.set("de", novoDe);
    if (novoAte) proximos.set("ate", novoAte);

    setParametros(proximos, { replace: true });
  }

  const nomeDoArquivo = useMemo(() => {
    if (!dados) return "relatorio";

    return `controle-financeiro-${dados.periodo.de}_a_${dados.periodo.ate}`;
  }, [dados]);

  /**
   * CSV com o mês a mês. É o formato que o usuário abre na planilha dele e
   * cruza com o que quiser — o PDF serve para mostrar, o CSV para continuar
   * trabalhando.
   */
  function exportarCsv() {
    if (!dados) return;

    try {
      const linhas = dados.evolucao.map((mes) => [
        mes.competencia,
        mes.rotulo,
        numeroParaCsv(mes.renda),
        numeroParaCsv(mes.gastos),
        numeroParaCsv(mes.saldo),
        numeroParaCsv(mes.necessidade),
        numeroParaCsv(mes.desejo),
        numeroParaCsv(mes.poupanca),
        numeroParaCsv(mes.taxa_economia),
      ]);

      linhas.push([
        "",
        "Total do período",
        numeroParaCsv(dados.totais.renda),
        numeroParaCsv(dados.totais.gastos),
        numeroParaCsv(dados.totais.saldo),
        numeroParaCsv(dados.por_tipo[0]?.total ?? 0),
        numeroParaCsv(dados.por_tipo[1]?.total ?? 0),
        numeroParaCsv(dados.por_tipo[2]?.total ?? 0),
        numeroParaCsv(dados.totais.taxa_economia),
      ]);

      baixarCsv(
        `${nomeDoArquivo}.csv`,
        montarCsv(
          ["Competência", "Mês", "Renda", "Gastos", "Saldo", "Necessidades", "Desejos", "Poupança", "Economia (%)"],
          linhas
        )
      );

      toast.sucesso("CSV gerado com sucesso.");
    } catch {
      toast.erro("Não foi possível gerar o CSV. Tente novamente.");
    }
  }

  /** jsPDF e html2canvas só baixam quando o usuário clica: juntos passam de 180 kB. */
  async function exportarPdf() {
    if (!areaImpressa.current || !dados) return;

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
      pdf.text(
        `Relatório — ${dados.periodo.de_rotulo} a ${dados.periodo.ate_rotulo}`,
        larguraPagina / 2,
        12,
        { align: "center" }
      );
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

      pdf.save(`${nomeDoArquivo}.pdf`);
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
        <PageHeader titulo="Relatórios" />
        <ErrorState
          titulo="Não foi possível carregar seu relatório"
          descricao={erro.mensagem}
          onTentarNovamente={recarregar}
        />
      </>
    );
  }

  if (carregando && !dados) {
    return <EsqueletoDoRelatorio />;
  }

  if (!dados) return null;

  const { periodo, totais, tem_dados: temDados } = dados;
  const temRenda = totais.renda > 0;

  return (
    <>
      <PageHeader
        titulo="Relatórios"
        descricao={
          periodo.meses === 1
            ? formatarCompetencia(periodo.de)
            : `De ${periodo.de_rotulo} a ${periodo.ate_rotulo}`
        }
        acoes={
          <>
            <SeletorIntervalo
              de={periodo.de}
              ate={periodo.ate}
              competencias={dados.competencias_disponiveis}
              onMudar={mudarIntervalo}
              desabilitado={carregando}
            />
            <Button
              variante="secundario"
              onClick={exportarCsv}
              iconeEsquerda={<FiFileText />}
              disabled={!temDados}
            >
              CSV
            </Button>
            <Button
              variante="secundario"
              onClick={exportarPdf}
              carregando={exportando}
              iconeEsquerda={<FiDownload />}
              disabled={!temDados}
            >
              PDF
            </Button>
          </>
        }
      />

      {!temDados ? (
        <Card>
          <EmptyState
            icone={<FiBarChart2 />}
            titulo="Nenhum dado neste período"
            descricao={
              (dados.competencias_disponiveis ?? []).length > 0
                ? "Escolha outro intervalo no seletor acima — os períodos oferecidos são os que têm registros."
                : "Registre sua renda e alguns lançamentos para que o relatório tenha o que analisar."
            }
          />
        </Card>
      ) : (
        <div ref={areaImpressa}>
          <Stack gap="var(--cf-esp-5)">
            {periodo.ajustado && (
              <div className="cf-aviso cf-aviso--info" role="status">
                <FiInfo aria-hidden="true" />
                <div className="cf-aviso__texto">
                  <p className="cf-aviso__titulo">
                    Mostrando até {periodo.ate_rotulo}
                  </p>
                  <p className="cf-aviso__descricao">
                    É o período mais recente com registros. Use o seletor para
                    escolher outro intervalo.
                  </p>
                </div>
              </div>
            )}

            <Grid minimo="220px">
              <StatCard
                rotulo="Renda no período"
                valor={totais.renda}
                destaque
                detalhe={`${formatarMoeda(totais.media_renda)}/mês em média`}
              />
              <StatCard
                rotulo="Gastos no período"
                valor={totais.gastos}
                tomValor={totais.gastos > 0 ? "negativo" : "padrao"}
                detalhe={`${formatarMoeda(totais.media_gastos)}/mês em média`}
              />
              <StatCard
                rotulo="Saldo acumulado"
                valor={totais.saldo}
                tomValor={totais.saldo >= 0 ? "positivo" : "negativo"}
                detalhe={`${totais.meses} ${totais.meses === 1 ? "mês" : "meses"} no intervalo`}
              />
              <StatCard
                rotulo="Taxa de economia"
                conteudo={temRenda ? formatarPercentual(totais.taxa_economia) : "—"}
                tomValor={totais.taxa_economia >= 0 ? "positivo" : "negativo"}
                detalhe={
                  temRenda
                    ? "Do que entrou, quanto sobrou"
                    : "Sem renda registrada no intervalo"
                }
              />
            </Grid>

            <EvolucaoMensal
              evolucao={dados.evolucao}
              intervalo={`${periodo.de}_${periodo.ate}`}
            />

            <Grid minimo="320px" gap="var(--cf-esp-5)">
              <ComposicaoRegra porTipo={dados.por_tipo} temRenda={temRenda} />
              <RankingCategorias
                categorias={dados.por_categoria}
                total={totais.gastos}
                meses={periodo.meses}
              />
            </Grid>

            <DestaquesPeriodo destaques={dados.destaques} />

            <TabelaMensal evolucao={dados.evolucao} carregando={carregando} />

            <p className="cf-relatorio__ressalva">
              Os valores somam exatamente o que você registrou no intervalo
              escolhido. A comparação com a regra 50/30/20 é uma referência
              didática, não recomendação financeira.
            </p>
          </Stack>
        </div>
      )}
    </>
  );
}

function EsqueletoDoRelatorio() {
  return (
    <>
      <PageHeader titulo="Carregando seu relatório…" />
      <Stack gap="var(--cf-esp-5)">
        <Grid minimo="220px">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cf-stat">
              <Skeleton largura="45%" altura="12px" />
              <Skeleton largura="70%" altura="26px" />
            </div>
          ))}
        </Grid>
        <div className="cf-card" style={{ padding: "var(--cf-esp-5)" }}>
          <Skeleton largura="30%" altura="16px" />
          <div style={{ height: "var(--cf-esp-4)" }} />
          <Skeleton altura="220px" />
        </div>
      </Stack>
    </>
  );
}
