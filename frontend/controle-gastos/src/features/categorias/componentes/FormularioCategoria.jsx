import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import { Field, Input, Modal, Select } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import "./categorias.css";

/**
 * Escolher o tipo é escolher em qual faixa da regra 50/30/20 todo gasto desta
 * categoria vai cair. É a decisão consequente do formulário, e por isso cada
 * opção vem com a explicação junto — não num tooltip.
 */
const TIPOS = [
  {
    valor: "necessidade",
    rotulo: "Necessidade",
    ajuda: "Contas que você não deixaria de pagar: moradia, mercado, transporte. Teto de 50% da renda.",
  },
  {
    valor: "desejo",
    rotulo: "Desejo",
    ajuda: "O que melhora a vida mas pode esperar: lazer, delivery, assinaturas. Teto de 30% da renda.",
  },
  {
    valor: "poupanca",
    rotulo: "Poupança",
    ajuda: "Dinheiro que fica com você: investimentos, reserva, quitar dívida. Meta de 20% da renda.",
  },
];

const ROTULO_DO_TIPO = Object.fromEntries(TIPOS.map((t) => [t.valor, t.rotulo]));

/**
 * Criação e edição de categoria — principal ou subcategoria.
 *
 * A escolha da mãe é o que decide o resto do formulário: uma subcategoria NÃO
 * escolhe tipo, porque herda o da mãe. Deixar o campo lá, editável, permitiria
 * "Moradia = necessidade" com "Aluguel = desejo" — dois gastos da mesma conta
 * em faixas diferentes da regra 50/30/20.
 */
export default function FormularioCategoria({
  aberto,
  categoria,
  paiId = null,
  principais = [],
  onFechar,
  onSalvo,
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("necessidade");
  const [maeId, setMaeId] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(categoria);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setNome(categoria?.nome ?? "");
    setTipo(categoria?.tipo ?? "necessidade");
    setMaeId(String(categoria?.categoria_pai_id ?? paiId ?? ""));
  }, [aberto, categoria, paiId]);

  /*
   * Só categorias principais podem ser mãe, e nunca a própria categoria que
   * está sendo editada — o backend recusa as duas coisas, mas oferecer a opção
   * seria convidar ao erro.
   */
  const maes = useMemo(
    () =>
      (principais ?? []).filter(
        (c) => !c.categoria_pai_id && String(c.id) !== String(categoria?.id ?? "")
      ),
    [principais, categoria]
  );

  const mae = useMemo(
    () => maes.find((c) => String(c.id) === String(maeId)),
    [maes, maeId]
  );

  // Uma categoria que já tem filhas não pode virar subcategoria: viraria um
  // terceiro nível. Em vez de deixar tentar e devolver erro, o campo fica
  // travado com a explicação.
  const temFilhas = (categoria?.subcategorias ?? []).length > 0;
  const ehSubcategoria = maeId !== "";

  const podeSalvar = nome.trim() !== "";
  const explicacao = TIPOS.find((t) => t.valor === tipo)?.ajuda;

  async function salvar() {
    setErro(null);
    setSalvando(true);

    // `tipo` só vai quando a categoria é principal. Na subcategoria ele é
    // ignorado pelo backend de qualquer forma, e mandá-lo sugeriria que a
    // escolha existe.
    const corpo = {
      nome: nome.trim(),
      categoria_pai_id: ehSubcategoria ? Number(maeId) : null,
      ...(ehSubcategoria ? {} : { tipo }),
    };

    try {
      if (editando) {
        await api.put(`/categorias/${categoria.id}`, corpo);
      } else {
        await api.post("/categorias", corpo);
      }

      onSalvo(
        editando
          ? ehSubcategoria
            ? "Subcategoria atualizada."
            : "Categoria atualizada."
          : ehSubcategoria
            ? "Subcategoria criada."
            : "Categoria criada."
      );
    } catch (error) {
      setErro(extrairErro(error));
    } finally {
      setSalvando(false);
    }
  }

  const titulo = editando
    ? ehSubcategoria
      ? "Editar subcategoria"
      : "Editar categoria"
    : ehSubcategoria
      ? "Nova subcategoria"
      : "Nova categoria";

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      rotuloConfirmar={editando ? "Salvar alterações" : "Criar categoria"}
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

        <Field label="Nome" obrigatorio erro={erro?.campos?.nome}>
          {(a) => (
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              placeholder={ehSubcategoria ? "Energia elétrica" : "Farmácia"}
              autoFocus
              {...a}
            />
          )}
        </Field>

        <Field
          label="Categoria mãe"
          erro={erro?.campos?.categoria_pai_id}
          ajuda={
            temFilhas
              ? "Esta categoria tem subcategorias, então ela própria não pode virar uma."
              : "Deixe em branco para criar uma categoria principal."
          }
        >
          {(a) => (
            <Select
              value={maeId}
              onChange={(e) => setMaeId(e.target.value)}
              disabled={temFilhas}
              {...a}
            >
              <option value="">Nenhuma — é uma categoria principal</option>
              {maes.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.nome}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* O tipo desaparece na subcategoria em vez de ficar desabilitado: um
            campo travado com um valor dentro dá a entender que ele foi
            escolhido aqui, e não herdado. */}
        {ehSubcategoria ? (
          <p className="cf-categorias-tela__ressalva">
            {mae
              ? `Herda a faixa da categoria mãe: ${ROTULO_DO_TIPO[mae.tipo] ?? mae.tipo}.`
              : "A faixa da regra 50/30/20 é herdada da categoria mãe."}
          </p>
        ) : (
          <Field label="Tipo" obrigatorio erro={erro?.campos?.tipo} ajuda={explicacao}>
            {(a) => (
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)} {...a}>
                {TIPOS.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {editando && !ehSubcategoria && (
          <p className="cf-categorias-tela__ressalva">
            Mudar o tipo reclassifica todos os lançamentos desta categoria na
            regra 50/30/20, inclusive os das subcategorias e os de meses
            anteriores.
          </p>
        )}
      </Stack>
    </Modal>
  );
}
