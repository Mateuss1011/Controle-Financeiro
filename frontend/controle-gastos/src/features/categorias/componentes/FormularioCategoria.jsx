import { useEffect, useState } from "react";
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

export default function FormularioCategoria({ aberto, categoria, onFechar, onSalvo }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("necessidade");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(categoria);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setNome(categoria?.nome ?? "");
    setTipo(categoria?.tipo ?? "necessidade");
  }, [aberto, categoria]);

  const podeSalvar = nome.trim() !== "";
  const explicacao = TIPOS.find((t) => t.valor === tipo)?.ajuda;

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const corpo = { nome: nome.trim(), tipo };

    try {
      if (editando) {
        await api.put(`/categorias/${categoria.id}`, corpo);
      } else {
        await api.post("/categorias", corpo);
      }

      onSalvo(editando ? "Categoria atualizada." : "Categoria criada.");
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
      titulo={editando ? "Editar categoria" : "Nova categoria"}
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
              placeholder="Farmácia"
              autoFocus
              {...a}
            />
          )}
        </Field>

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

        {editando && (
          <p className="cf-categorias-tela__ressalva">
            Mudar o tipo reclassifica todos os lançamentos desta categoria na
            regra 50/30/20, inclusive os de meses anteriores.
          </p>
        )}
      </Stack>
    </Modal>
  );
}
