import { useEffect, useState } from "react";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import { Badge, Field, Input, InputMoeda, Modal, Select } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import { useGastos } from "../../../Context/gastosContext";
import { useSelecaoDeCategoria } from "../../categorias/useSelecaoDeCategoria";

const HOJE = () => new Date().toISOString().slice(0, 10);

const VAZIO = {
  descricao: "",
  valor: "",
  data: HOJE(),
};

const ROTULO_DO_TIPO = {
  necessidade: "Necessidade",
  desejo: "Desejo",
  poupanca: "Poupança",
};

/**
 * Criação e edição de lançamento.
 *
 * O mesmo formulário serve aos dois casos: a diferença é a presença de `gasto`.
 * Os erros de validação vêm do backend e são exibidos no campo que os originou,
 * nunca como um "verifique os dados" genérico no rodapé.
 */
export default function FormularioLancamento({ aberto, gasto, onFechar, onSalvo }) {
  const { categorias } = useGastos();
  const selecao = useSelecaoDeCategoria(categorias);

  const [campos, setCampos] = useState(VAZIO);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(gasto?.id);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setCampos(
      gasto
        ? {
            descricao: gasto.descricao ?? "",
            valor: gasto.valor != null ? String(gasto.valor) : "",
            data: gasto.data_lancamento ?? HOJE(),
          }
        : { ...VAZIO, data: HOJE() }
    );

    // Um id só reconstrói os dois selects: se ele for de uma subcategoria, a
    // categoria vem do pai. Vale igual para editar e para duplicar.
    selecao.definirPeloIdGravado(gasto?.categoria?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, gasto]);

  const definir = (campo) => (evento) =>
    setCampos((atuais) => ({ ...atuais, [campo]: evento.target.value }));

  const podeSalvar =
    campos.descricao.trim() !== "" &&
    campos.valor !== "" &&
    Number(campos.valor) > 0 &&
    campos.data !== "" &&
    // A subcategoria é opcional; a categoria, não.
    selecao.categoriaId !== "";

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const corpo = {
      descricao: campos.descricao.trim(),
      valor: Number(campos.valor),
      data: campos.data,
      categoria_id: Number(selecao.categoriaIdParaEnviar),
    };

    try {
      if (editando) {
        await api.put(`/gastos/${gasto.id}`, corpo);
        onSalvo("Lançamento atualizado.");
      } else {
        await api.post("/gastos", corpo);
        onSalvo("Lançamento adicionado.");
      }
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
      titulo={editando ? "Editar lançamento" : "Novo lançamento"}
      rotuloConfirmar={editando ? "Salvar alterações" : "Adicionar"}
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

        <Field label="Descrição" obrigatorio erro={erro?.campos?.descricao}>
          {(a) => (
            <Input
              placeholder="Ex.: Supermercado do mês"
              value={campos.descricao}
              onChange={definir("descricao")}
              autoFocus
              {...a}
            />
          )}
        </Field>

        <div className="cf-form__linha">
          <Field label="Valor" obrigatorio erro={erro?.campos?.valor}>
            {(a) => (
              <InputMoeda value={campos.valor} onChange={definir("valor")} {...a} />
            )}
          </Field>

          <Field label="Data" obrigatorio erro={erro?.campos?.data}>
            {(a) => (
              <Input type="date" value={campos.data} onChange={definir("data")} {...a} />
            )}
          </Field>
        </div>

        <Field
          label="Categoria"
          obrigatorio
          erro={erro?.campos?.categoria_id}
          ajuda={
            selecao.categoriaEscolhida
              ? `Entra na faixa "${ROTULO_DO_TIPO[selecao.tipo]}" da regra 50/30/20.`
              : undefined
          }
        >
          {(a) => (
            <Select
              value={selecao.categoriaId}
              onChange={(e) => selecao.definirCategoria(e.target.value)}
              {...a}
            >
              <option value="">Selecione uma categoria</option>
              {selecao.principais.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/*
          * O segundo select só aparece quando há o que escolher.
          *
          * E a subcategoria é opcional de propósito: um gasto genérico entra
          * direto em "Moradia", sem obrigar ninguém a inventar uma subcategoria
          * "Outros" só para preencher o campo.
          */}
        {selecao.subcategorias.length > 0 && (
          <Field
            label="Subcategoria"
            ajuda="Opcional. Deixe em branco para lançar direto na categoria."
          >
            {(a) => (
              <Select
                value={selecao.subcategoriaId}
                onChange={(e) => selecao.definirSubcategoria(e.target.value)}
                {...a}
              >
                <option value="">Sem subcategoria</option>
                {selecao.subcategorias.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {/* Mostrar a faixa antes de salvar evita a surpresa de descobrir só no
            Dashboard que o gasto entrou em "Desejos". */}
        {selecao.categoriaEscolhida && (
          <div>
            <Badge tom={selecao.tipo} ponto>
              {ROTULO_DO_TIPO[selecao.tipo]}
            </Badge>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
