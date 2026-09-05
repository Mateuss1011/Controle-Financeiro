import { useMemo, useState } from "react";
import { FiEdit2, FiLock, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  Button,
  Card,
  ErrorState,
  Modal,
  SkeletonTexto,
  useToast,
} from "../../components/ui";
import { PageHeader, Stack } from "../../components/layout";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";
import { useGastos } from "../../Context/gastosContext";
import { useLancamentosGlobais } from "../lancamentos/lancamentosContext";
import FormularioCategoria from "./componentes/FormularioCategoria";
import "./componentes/categorias.css";

/**
 * As três faixas na ordem da regra, com a cor que já as identifica no resto do
 * produto — a mesma leitura do donut do Dashboard e do relatório.
 */
const FAIXAS = [
  { tipo: "necessidade", rotulo: "Necessidades", cor: "var(--cf-necessidade)", regra: "até 50% da renda" },
  { tipo: "desejo", rotulo: "Desejos", cor: "var(--cf-desejo)", regra: "até 30% da renda" },
  { tipo: "poupanca", rotulo: "Poupança", cor: "var(--cf-poupanca)", regra: "meta de 20% da renda" },
];

/**
 * Categorias.
 *
 * Duas naturezas convivem: as do sistema, iguais para todo mundo e não
 * editáveis, e as suas. A tela deixa a diferença visível em vez de esconder os
 * botões e deixar a ausência parecer um bug.
 */
export default function CategoriasPage() {
  const toast = useToast();
  const {
    categorias,
    carregandoCategorias,
    erroCategorias,
    carregarCategorias,
  } = useGastos();
  // Trocar o tipo de uma categoria reclassifica a regra 50/30/20: o Dashboard
  // e os relatórios precisam recarregar.
  const { notificarMudanca } = useLancamentosGlobais();

  const [formulario, setFormulario] = useState({ aberto: false, categoria: null });
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const porFaixa = useMemo(() => {
    const mapa = Object.fromEntries(FAIXAS.map((f) => [f.tipo, []]));

    for (const categoria of categorias ?? []) {
      (mapa[categoria.tipo] ??= []).push(categoria);
    }

    return mapa;
  }, [categorias]);

  const abrirNova = () => setFormulario({ aberto: true, categoria: null });
  const abrirEdicao = (categoria) => setFormulario({ aberto: true, categoria });
  const fechar = () => setFormulario({ aberto: false, categoria: null });

  async function aoSalvar(mensagem) {
    fechar();
    await carregarCategorias();
    notificarMudanca();
    toast.sucesso(mensagem);
  }

  async function confirmarExclusao() {
    setExcluindo(true);

    try {
      await api.delete(`/categorias/${paraExcluir.id}`);
      setParaExcluir(null);
      await carregarCategorias();
      notificarMudanca();
      toast.sucesso("Categoria excluída.");
    } catch (error) {
      toast.erro(extrairErro(error).mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  if (erroCategorias) {
    return (
      <>
        <PageHeader titulo="Categorias" />
        <ErrorState
          titulo="Não foi possível carregar suas categorias"
          descricao={erroCategorias.mensagem}
          onTentarNovamente={carregarCategorias}
        />
      </>
    );
  }

  const emUso = (paraExcluir?.total_lancamentos ?? 0) > 0;

  return (
    <>
      <PageHeader
        titulo="Categorias"
        descricao="Como seus gastos são classificados na regra 50/30/20."
        acoes={
          <Button onClick={abrirNova} iconeEsquerda={<FiPlus />}>
            Nova categoria
          </Button>
        }
      />

      <Stack gap="var(--cf-esp-5)">
        {FAIXAS.map((faixa) => (
          <Card
            key={faixa.tipo}
            semPadding={!carregandoCategorias}
            titulo={
              <span className="cf-faixa__titulo">
                <span
                  className="cf-faixa__marca"
                  style={{ background: faixa.cor }}
                  aria-hidden="true"
                />
                {faixa.rotulo}
              </span>
            }
            descricao={faixa.regra}
          >
            {carregandoCategorias ? (
              <SkeletonTexto linhas={3} />
            ) : porFaixa[faixa.tipo].length === 0 ? (
              <p className="cf-categoria__vazia">
                Nenhuma categoria nesta faixa ainda.
              </p>
            ) : (
              <ul className="cf-categoria-lista">
                {porFaixa[faixa.tipo].map((categoria) => (
                  <li key={categoria.id} className="cf-categoria">
                    <span className="cf-categoria__identidade">
                      <span className="cf-categoria__nome">{categoria.nome}</span>
                      {categoria.global && (
                        <span className="cf-categoria__padrao">
                          <FiLock aria-hidden="true" /> do sistema
                        </span>
                      )}
                    </span>

                    <span className="cf-categoria__direita">
                      <span className="cf-categoria__uso">
                        {categoria.total_lancamentos === 1
                          ? "1 lançamento"
                          : `${categoria.total_lancamentos ?? 0} lançamentos`}
                      </span>

                      {!categoria.global && (
                        <span className="cf-categoria__acoes">
                          <button
                            type="button"
                            className="cf-item__acao"
                            onClick={() => abrirEdicao(categoria)}
                            aria-label={`Editar categoria ${categoria.nome}`}
                            title="Editar"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="cf-item__acao cf-item__acao--perigo"
                            onClick={() => setParaExcluir(categoria)}
                            aria-label={`Excluir categoria ${categoria.nome}`}
                            title="Excluir"
                          >
                            <FiTrash2 />
                          </button>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

        <p className="cf-categorias-tela__ressalva">
          As categorias do sistema são iguais para todo mundo e não podem ser
          alteradas. Crie as suas para o que for específico da sua vida.
        </p>
      </Stack>

      <FormularioCategoria
        aberto={formulario.aberto}
        categoria={formulario.categoria}
        onFechar={fechar}
        onSalvo={aoSalvar}
      />

      <Modal
        aberto={Boolean(paraExcluir)}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir categoria"
        rotuloConfirmar="Excluir"
        varianteConfirmar="perigo"
        // O handler continua ligado mesmo quando a exclusão é impossível: sem
        // ele o Modal descarta o rodapé inteiro e leva o "Cancelar" junto.
        // Quem barra a ação é `confirmarDesabilitado`.
        onConfirmar={confirmarExclusao}
        confirmarDesabilitado={emUso}
        confirmando={excluindo}
      >
        {/* O impedimento é dito ANTES do clique. Deixar tentar e devolver erro
            seria transformar uma regra conhecida numa surpresa. */}
        {emUso ? (
          <p>
            <strong>{paraExcluir?.nome}</strong> tem{" "}
            {paraExcluir?.total_lancamentos === 1
              ? "1 lançamento"
              : `${paraExcluir?.total_lancamentos} lançamentos`}{" "}
            e não pode ser excluída. Reclassifique esses lançamentos em outra
            categoria antes de tentar de novo.
          </p>
        ) : (
          <>
            <p>
              Tem certeza que deseja excluir a categoria{" "}
              <strong>{paraExcluir?.nome}</strong>?
            </p>
            <p className="cf-lancamentos__aviso-exclusao">
              Ela não tem nenhum lançamento, então nada é perdido. Um orçamento
              definido para ela também deixa de existir.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
