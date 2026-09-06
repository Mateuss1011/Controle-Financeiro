import { useMemo, useState } from "react";
import { FiChevronRight, FiEdit2, FiLock, FiPlus, FiTrash2 } from "react-icons/fi";
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

const plural = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

/**
 * Categorias.
 *
 * Duas dimensões independentes convivem aqui, e confundi-las é o erro fácil:
 *
 *  - a FAIXA (necessidade/desejo/poupança) é a regra 50/30/20, e existe só em
 *    três valores fixos;
 *  - a HIERARQUIA (categoria › subcategoria) é o vocabulário do usuário, e tem
 *    exatamente dois níveis.
 *
 * A tela é a faixa por fora e a árvore por dentro. A subcategoria não aparece
 * solta: ela vive recolhida dentro da mãe, porque com ~26 categorias e ~84
 * subcategorias uma lista plana de 110 linhas não se lê.
 *
 * A outra distinção visível é a origem: as do sistema são iguais para todo
 * mundo e não editáveis, as suas são suas. A etiqueta explica a ausência dos
 * botões em vez de deixá-la parecer um bug.
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

  const [formulario, setFormulario] = useState({ aberto: false, categoria: null, paiId: null });
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [expandidas, setExpandidas] = useState(() => new Set());

  const porFaixa = useMemo(() => {
    const mapa = Object.fromEntries(FAIXAS.map((f) => [f.tipo, []]));

    // A listagem já vem em árvore: o primeiro nível são as principais, e as
    // filhas vêm dentro delas. Filtrar por `categoria_pai_id` mesmo assim é a
    // garantia de que uma subcategoria nunca vai parar na raiz da tela.
    for (const categoria of categorias ?? []) {
      if (categoria.categoria_pai_id) continue;

      (mapa[categoria.tipo] ??= []).push(categoria);
    }

    return mapa;
  }, [categorias]);

  const alternar = (id) =>
    setExpandidas((atuais) => {
      const proximas = new Set(atuais);
      proximas.has(id) ? proximas.delete(id) : proximas.add(id);

      return proximas;
    });

  const abrirNova = () => setFormulario({ aberto: true, categoria: null, paiId: null });
  const abrirEdicao = (categoria) => setFormulario({ aberto: true, categoria, paiId: null });
  const fechar = () => setFormulario({ aberto: false, categoria: null, paiId: null });

  /** Criar já dentro da mãe: o select de categoria mãe vem preenchido. */
  function abrirNovaSubcategoria(mae) {
    setExpandidas((atuais) => new Set(atuais).add(mae.id));
    setFormulario({ aberto: true, categoria: null, paiId: mae.id });
  }

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
      const eraSubcategoria = Boolean(paraExcluir.categoria_pai_id);
      setParaExcluir(null);
      await carregarCategorias();
      notificarMudanca();
      toast.sucesso(eraSubcategoria ? "Subcategoria excluída." : "Categoria excluída.");
    } catch (error) {
      // O backend confere as mesmas regras e mais uma que a tela não tem como
      // saber (orçamentos definidos). A mensagem dele é a que vale.
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

  const impedimento = impedimentoParaExcluir(paraExcluir);

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
                  <NoDaCategoria
                    key={categoria.id}
                    categoria={categoria}
                    expandida={expandidas.has(categoria.id)}
                    onAlternar={() => alternar(categoria.id)}
                    onNovaSubcategoria={() => abrirNovaSubcategoria(categoria)}
                    onEditar={abrirEdicao}
                    onExcluir={setParaExcluir}
                  />
                ))}
              </ul>
            )}
          </Card>
        ))}

        <p className="cf-categorias-tela__ressalva">
          As categorias do sistema são iguais para todo mundo e não podem ser
          alteradas. Você pode criar as suas — inclusive subcategorias dentro
          das do sistema, para o que for específico da sua vida.
        </p>
      </Stack>

      <FormularioCategoria
        aberto={formulario.aberto}
        categoria={formulario.categoria}
        paiId={formulario.paiId}
        principais={categorias ?? []}
        onFechar={fechar}
        onSalvo={aoSalvar}
      />

      <Modal
        aberto={Boolean(paraExcluir)}
        onFechar={() => setParaExcluir(null)}
        titulo={paraExcluir?.categoria_pai_id ? "Excluir subcategoria" : "Excluir categoria"}
        rotuloConfirmar="Excluir"
        varianteConfirmar="perigo"
        // O handler continua ligado mesmo quando a exclusão é impossível: sem
        // ele o Modal descarta o rodapé inteiro e leva o "Cancelar" junto.
        // Quem barra a ação é `confirmarDesabilitado`.
        onConfirmar={confirmarExclusao}
        confirmarDesabilitado={Boolean(impedimento)}
        confirmando={excluindo}
      >
        {/* O impedimento é dito ANTES do clique. Deixar tentar e devolver erro
            seria transformar uma regra conhecida numa surpresa. */}
        {impedimento ?? (
          <>
            <p>
              Tem certeza que deseja excluir{" "}
              {paraExcluir?.categoria_pai_id ? "a subcategoria" : "a categoria"}{" "}
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

/**
 * Uma categoria principal e, recolhidas dentro dela, as subcategorias.
 *
 * O botão de expandir é o único elemento interativo do gesto: ele declara
 * `aria-expanded` e aponta com `aria-controls` para a lista que abre e fecha —
 * que continua no DOM justamente para que essa referência exista.
 */
function NoDaCategoria({
  categoria,
  expandida,
  onAlternar,
  onNovaSubcategoria,
  onEditar,
  onExcluir,
}) {
  const filhas = categoria.subcategorias ?? [];
  const idDaLista = `subcategorias-de-${categoria.id}`;

  return (
    <li className="cf-categoria-no">
      <div className="cf-categoria">
        <span className="cf-categoria__identidade">
          {filhas.length > 0 ? (
            <button
              type="button"
              className={`cf-categoria__expandir ${expandida ? "cf-categoria__expandir--aberta" : ""}`}
              onClick={onAlternar}
              aria-expanded={expandida}
              aria-controls={idDaLista}
              aria-label={`${expandida ? "Recolher" : "Expandir"} subcategorias de ${categoria.nome}`}
            >
              <FiChevronRight aria-hidden="true" />
            </button>
          ) : (
            // Espaço reservado: sem ele os nomes das categorias sem filhas
            // ficariam desalinhados dos que têm.
            <span className="cf-categoria__expandir cf-categoria__expandir--vazio" aria-hidden="true" />
          )}

          <span className="cf-categoria__nome">{categoria.nome}</span>

          <EtiquetaDeOrigem global={categoria.global} />

          {filhas.length > 0 && (
            <span className="cf-categoria__filhas-total">
              {plural(filhas.length, "subcategoria", "subcategorias")}
            </span>
          )}
        </span>

        <span className="cf-categoria__direita">
          {/* Na mãe o número é ACUMULADO: inclui o que foi lançado nas filhas,
              que é exatamente o que o orçamento dela consome. */}
          <span className="cf-categoria__uso">
            {plural(categoria.total_lancamentos ?? 0, "lançamento", "lançamentos")}
          </span>

          <span className="cf-categoria__acoes">
            <button
              type="button"
              className="cf-item__acao"
              onClick={onNovaSubcategoria}
              aria-label={`Nova subcategoria em ${categoria.nome}`}
              title="Nova subcategoria"
            >
              <FiPlus />
            </button>

            {!categoria.global && (
              <>
                <button
                  type="button"
                  className="cf-item__acao"
                  onClick={() => onEditar(categoria)}
                  aria-label={`Editar categoria ${categoria.nome}`}
                  title="Editar"
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  className="cf-item__acao cf-item__acao--perigo"
                  onClick={() => onExcluir(categoria)}
                  aria-label={`Excluir categoria ${categoria.nome}`}
                  title="Excluir"
                >
                  <FiTrash2 />
                </button>
              </>
            )}
          </span>
        </span>
      </div>

      {filhas.length > 0 && (
        <ul id={idDaLista} className="cf-subcategoria-lista" hidden={!expandida}>
          {filhas.map((filha) => (
            <li key={filha.id} className="cf-categoria cf-categoria--filha">
              <span className="cf-categoria__identidade">
                <span className="cf-categoria__nome">{filha.nome}</span>
                <EtiquetaDeOrigem global={filha.global} />
              </span>

              <span className="cf-categoria__direita">
                <span className="cf-categoria__uso">
                  {plural(filha.total_lancamentos ?? 0, "lançamento", "lançamentos")}
                </span>

                {!filha.global && (
                  <span className="cf-categoria__acoes">
                    <button
                      type="button"
                      className="cf-item__acao"
                      onClick={() => onEditar(filha)}
                      aria-label={`Editar subcategoria ${filha.nome}`}
                      title="Editar"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="cf-item__acao cf-item__acao--perigo"
                      onClick={() => onExcluir(filha)}
                      aria-label={`Excluir subcategoria ${filha.nome}`}
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
    </li>
  );
}

function EtiquetaDeOrigem({ global }) {
  return global ? (
    <span className="cf-categoria__padrao">
      <FiLock aria-hidden="true" /> do sistema
    </span>
  ) : (
    <span className="cf-categoria__padrao cf-categoria__padrao--sua">sua</span>
  );
}

/**
 * O que impede a exclusão, já como texto, ou `null` quando nada impede.
 *
 * As mesmas regras do backend, na ordem em que ele as aplica — menos a de
 * orçamentos, que a tela não tem como conferir sem uma requisição a mais. Essa
 * chega como erro e vira toast.
 */
function impedimentoParaExcluir(categoria) {
  if (!categoria) return null;

  const lancamentos = categoria.total_lancamentos ?? 0;
  const filhas = categoria.subcategorias ?? [];
  const eSubcategoria = Boolean(categoria.categoria_pai_id);

  if (lancamentos > 0) {
    const nasFilhas = lancamentos > (categoria.lancamentos_diretos ?? lancamentos);

    return (
      <p>
        <strong>{categoria.nome}</strong> tem {plural(lancamentos, "lançamento", "lançamentos")}
        {nasFilhas ? " (contando os das subcategorias)" : ""} e não pode ser
        excluída. {lancamentos === 1 ? "Reclassifique esse lançamento" : "Reclassifique esses lançamentos"}{" "}
        em outra {eSubcategoria ? "subcategoria" : "categoria"} antes de tentar
        de novo.
      </p>
    );
  }

  if (filhas.length > 0) {
    return (
      <p>
        <strong>{categoria.nome}</strong> tem{" "}
        {plural(filhas.length, "subcategoria", "subcategorias")} e não pode ser
        excluída. Exclua {filhas.length === 1 ? "a subcategoria" : "as subcategorias"}{" "}
        antes de tentar de novo.
      </p>
    );
  }

  return null;
}
