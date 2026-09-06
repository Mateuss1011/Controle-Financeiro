import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import { Field, InputMoeda, Modal, Select } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import { useGastos } from "../../../Context/gastosContext";
import { formatarCompetencia, formatarMoeda } from "../../../lib/format";

/**
 * Definição do limite de uma categoria.
 *
 * Duas naturezas, e a diferença importa:
 *
 *  - RECORRENTE vale para todo mês. É o caso comum: define-se "Alimentação:
 *    R$ 800" uma vez e pronto.
 *  - SÓ NESTE MÊS cria uma exceção — dezembro, férias, um mês atípico — sem
 *    mexer no valor de sempre.
 */
export default function FormularioOrcamento({
  aberto,
  orcamento,
  competencia,
  jaOrcadas,
  onFechar,
  onSalvo,
}) {
  const { categorias } = useGastos();

  const [categoriaId, setCategoriaId] = useState("");
  const [limite, setLimite] = useState("");
  const [recorrente, setRecorrente] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(orcamento);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setCategoriaId(orcamento ? String(orcamento.categoria_id) : "");
    setLimite(orcamento ? String(orcamento.limite) : "");
    setRecorrente(orcamento ? orcamento.recorrente : true);
  }, [aberto, orcamento]);

  /*
   * Todas as categorias são oferecidas, mesmo as que já têm limite.
   *
   * Filtrá-las parecia proteger o usuário, mas impedia um caso legítimo: criar
   * o limite de TODO MÊS para uma categoria que hoje só tem a exceção deste
   * mês. Como o endpoint é um upsert por (categoria, vigência), escolher uma
   * combinação existente apenas atualiza o valor — e o aviso abaixo diz isso
   * antes do envio, do mesmo jeito que no formulário de renda.
   */
  const jaDefinido = useMemo(
    () =>
      editando
        ? null
        : (jaOrcadas ?? []).find(
            (o) => String(o.categoria_id) === String(categoriaId) && o.recorrente === recorrente
          ),
    [editando, jaOrcadas, categoriaId, recorrente]
  );

  const podeSalvar = categoriaId !== "" && limite !== "" && Number(limite) > 0;

  async function salvar() {
    setErro(null);
    setSalvando(true);

    try {
      await api.post("/orcamentos", {
        categoria_id: Number(categoriaId),
        valor_limite: Number(limite),
        competencia: recorrente ? null : competencia,
      });

      onSalvo(editando ? "Orçamento atualizado." : "Orçamento definido.");
    } catch (error) {
      setErro(extrairErro(error));
    } finally {
      setSalvando(false);
    }
  }



  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? "Editar orçamento" : "Novo orçamento"}
      rotuloConfirmar={editando ? "Salvar alterações" : "Definir limite"}
      onConfirmar={salvar}
      confirmarDesabilitado={!podeSalvar}
      confirmando={salvando}
    >
      <Stack>
        {erro?.mensagem && Object.keys(erro.campos ?? {}).length === 0 && (
          <div className="cf-auth__alerta" role="alert">
            <span>{erro.mensagem}</span>
          </div>
        )}

        <Field
          label="Categoria"
          obrigatorio
          erro={erro?.campos?.categoria_id}
          ajuda={editando ? "A categoria de um orçamento existente não muda." : undefined}
        >
          {(a) => (
            <Select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              disabled={editando}
              {...a}
            >
              <option value="">Selecione uma categoria</option>
              {/* Só categorias principais: o orçamento vive na mãe, e os
                  gastos das subcategorias consomem o limite dela. */}
              {(categorias ?? [])
                .filter((categoria) => !categoria.categoria_pai_id)
                .map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
            </Select>
          )}
        </Field>

        <Field
          label="Limite mensal"
          obrigatorio
          erro={erro?.campos?.valor_limite}
          ajuda="Quanto você quer no máximo gastar nesta categoria, somando as subcategorias dela."
        >
          {(a) => (
            <InputMoeda
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              autoFocus
              {...a}
            />
          )}
        </Field>

        <Field
          label="Vigência"
          erro={erro?.campos?.competencia}
          ajuda={editando ? "A vigência de um orçamento existente não muda." : undefined}
        >
          {(a) => (
            <Select
              value={recorrente ? "recorrente" : "mes"}
              onChange={(e) => setRecorrente(e.target.value === "recorrente")}
              disabled={editando}
              {...a}
            >
              <option value="recorrente">Todo mês</option>
              <option value="mes">
                Somente em {formatarCompetencia(competencia)}
              </option>
            </Select>
          )}
        </Field>

        <p className="cf-orcamento__explicacao">
          {recorrente
            ? "Este limite vale para qualquer mês que não tenha uma exceção definida."
            : `Este limite vale só para ${formatarCompetencia(competencia)} e substitui o limite de todo mês, se houver.`}
        </p>

        {limite !== "" && Number(limite) > 0 && (
          <p className="cf-orcamento__explicacao">
            Equivale a {formatarMoeda(Number(limite) / 30)} por dia.
          </p>
        )}

        {jaDefinido && (
          <div className="cf-aviso cf-aviso--atencao" role="status">
            <div className="cf-aviso__texto">
              <p className="cf-aviso__titulo">
                {jaDefinido.categoria} já tem esse tipo de limite
              </p>
              <p className="cf-aviso__descricao">
                O valor atual, {formatarMoeda(jaDefinido.limite)}, será substituído.
              </p>
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
