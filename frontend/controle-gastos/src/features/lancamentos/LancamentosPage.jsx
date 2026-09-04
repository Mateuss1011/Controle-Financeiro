import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiInbox, FiPlus, FiSearch } from "react-icons/fi";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  Money,
  useToast,
} from "../../components/ui";
import { PageHeader, Stack } from "../../components/layout";
import { useGastos } from "../../Context/gastosContext";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";
import FiltrosLancamentos from "./componentes/FiltrosLancamentos";
import ListaLancamentos from "./componentes/ListaLancamentos";
import Paginacao from "./componentes/Paginacao";
import { useLancamentosGlobais } from "./lancamentosContext";
import { useListaLancamentos } from "./useListaLancamentos";
import "./componentes/lancamentos.css";

const PADROES = {
  busca: "",
  tipo: "",
  competencia: "",
  categoria_id: "",
  ordenar_por: "data",
  direcao: "desc",
  pagina: "1",
};

export default function LancamentosPage() {
  /*
   * Os filtros moram na URL, e não em estado local. Assim o botão "voltar"
   * funciona, recarregar a página não perde o recorte e o usuário pode guardar
   * ou compartilhar um link para "desejos de agosto".
   */
  const [parametros, setParametros] = useSearchParams();
  const { categorias } = useGastos();
  const { abrirNovo, abrirEdicao, duplicar, notificarMudanca, versao } = useLancamentosGlobais();
  const toast = useToast();

  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const filtros = useMemo(() => {
    const atuais = { ...PADROES };

    for (const chave of Object.keys(PADROES)) {
      const valor = parametros.get(chave);
      if (valor !== null) atuais[chave] = valor;
    }

    return atuais;
  }, [parametros]);

  const consulta = useMemo(
    () => ({
      busca: filtros.busca,
      tipo: filtros.tipo,
      competencia: filtros.competencia,
      categoria_id: filtros.categoria_id,
      ordenar_por: filtros.ordenar_por,
      direcao: filtros.direcao,
      page: filtros.pagina,
    }),
    [filtros]
  );

  const { lancamentos, paginacao, total, carregando, erro, recarregar } =
    useListaLancamentos(consulta, versao);

  const atualizarFiltros = useCallback(
    (mudancas) => {
      setParametros((atuais) => {
        const novos = new URLSearchParams(atuais);

        for (const [chave, valor] of Object.entries(mudancas)) {
          // Comparação como texto: `pagina: 1` (número) e o padrão "1" são o
          // mesmo valor, e o padrão não precisa aparecer na URL.
          const texto = valor == null ? "" : String(valor);

          if (texto === "" || texto === PADROES[chave]) {
            novos.delete(chave);
          } else {
            novos.set(chave, texto);
          }
        }

        return novos;
      });
    },
    [setParametros]
  );

  const limparFiltros = useCallback(() => setParametros({}), [setParametros]);

  const temFiltro =
    filtros.busca !== "" ||
    filtros.tipo !== "" ||
    filtros.competencia !== "" ||
    filtros.categoria_id !== "";

  async function confirmarExclusao() {
    setExcluindo(true);

    try {
      await api.delete(`/gastos/${paraExcluir.id}`);
      setParaExcluir(null);
      notificarMudanca();
      toast.sucesso("Lançamento excluído.");
    } catch (error) {
      toast.erro(extrairErro(error).mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Lançamentos"
        descricao="Tudo que você registrou, com filtros para achar o que importa."
        acoes={
          <Button onClick={abrirNovo} iconeEsquerda={<FiPlus />}>
            Novo lançamento
          </Button>
        }
      />

      <Stack gap="var(--cf-esp-5)">
        <Card semPadding>
          <div className="cf-lancamentos__topo">
            <FiltrosLancamentos
              filtros={filtros}
              categorias={categorias}
              onMudar={atualizarFiltros}
              onLimpar={limparFiltros}
              temFiltro={temFiltro}
            />

            {/* O total do recorte, não o da página: é o que responde "quanto
                gastei com isso?" depois de filtrar. */}
            <div className="cf-lancamentos__resumo" aria-live="polite">
              <span className="cf-lancamentos__contagem">
                {carregando
                  ? "Carregando…"
                  : `${paginacao?.total ?? 0} ${
                      (paginacao?.total ?? 0) === 1 ? "lançamento" : "lançamentos"
                    }`}
                {temFiltro && !carregando && " no filtro atual"}
              </span>
              <Money valor={total} tamanho="md" />
            </div>
          </div>

          {erro ? (
            <ErrorState
              compacto
              titulo="Não foi possível carregar seus lançamentos"
              descricao={erro.mensagem}
              onTentarNovamente={recarregar}
            />
          ) : !carregando && lancamentos.length === 0 ? (
            temFiltro ? (
              <EmptyState
                compacto
                icone={<FiSearch />}
                titulo="Nenhum lançamento com esses filtros"
                descricao="Tente ampliar o período, trocar a categoria ou limpar a busca."
                acaoRotulo="Limpar filtros"
                onAcao={limparFiltros}
              />
            ) : (
              <EmptyState
                icone={<FiInbox />}
                titulo="Você ainda não possui lançamentos"
                descricao="Adicione seu primeiro gasto para começar a acompanhar para onde o dinheiro está indo."
                acaoRotulo="Adicionar lançamento"
                onAcao={abrirNovo}
              />
            )
          ) : (
            <ListaLancamentos
              lancamentos={lancamentos}
              carregando={carregando}
              agrupar={filtros.ordenar_por === "data"}
              onEditar={abrirEdicao}
              onDuplicar={duplicar}
              onExcluir={setParaExcluir}
            />
          )}

          {!erro && (
            <Paginacao
              paginacao={paginacao}
              onIr={(pagina) => atualizarFiltros({ pagina: String(pagina) })}
            />
          )}
        </Card>
      </Stack>

      <Modal
        aberto={Boolean(paraExcluir)}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir lançamento"
        rotuloConfirmar="Excluir"
        varianteConfirmar="perigo"
        onConfirmar={confirmarExclusao}
        confirmando={excluindo}
      >
        <p>
          Tem certeza que deseja excluir{" "}
          <strong>{paraExcluir?.descricao}</strong>, de{" "}
          <Money valor={paraExcluir?.valor ?? 0} tamanho="sm" />?
        </p>
        <p className="cf-lancamentos__aviso-exclusao">
          Esta ação não pode ser desfeita e o valor sai dos cálculos do período.
        </p>
      </Modal>
    </>
  );
}
