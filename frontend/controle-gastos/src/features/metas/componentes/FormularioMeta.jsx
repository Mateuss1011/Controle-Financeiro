import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import { Field, Input, InputMoeda, Modal } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import { formatarMoeda, numero } from "../../../lib/format";

/** Meses do mês corrente até o do prazo — a mesma contagem do backend. */
function mesesAte(prazo) {
  const [ano, mes] = String(prazo).split("-").map(Number);
  if (!ano || !mes) return null;

  const hoje = new Date();
  const diferenca = (ano - hoje.getFullYear()) * 12 + (mes - (hoje.getMonth() + 1));

  return Math.max(1, diferenca + 1);
}

/**
 * Criação e edição de uma meta.
 *
 * O prazo é opcional de propósito: "juntar R$ 10.000 para a reserva de
 * emergência" é uma meta legítima sem data. A diferença é consequente e o
 * formulário diz qual é — só meta com prazo entra no cálculo de quanto ainda
 * dá para gastar no mês.
 */
export default function FormularioMeta({ aberto, meta, onFechar, onSalvo }) {
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [atual, setAtual] = useState("");
  const [prazo, setPrazo] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(meta);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setNome(meta?.nome ?? "");
    setObjetivo(meta ? String(meta.valor_objetivo) : "");
    setAtual(meta ? String(meta.valor_atual) : "");
    setPrazo(meta?.prazo ?? "");
  }, [aberto, meta]);

  const valorObjetivo = numero(objetivo);
  const valorAtual = numero(atual);
  const acimaDoObjetivo = atual !== "" && objetivo !== "" && valorAtual > valorObjetivo;

  const podeSalvar =
    nome.trim() !== "" && objetivo !== "" && valorObjetivo > 0 && !acimaDoObjetivo;

  // Prévia do compromisso mensal, calculada com a mesma regra do backend, para
  // o usuário ver o efeito do prazo antes de salvar.
  const previa = useMemo(() => {
    if (!prazo || valorObjetivo <= 0) return null;

    const meses = mesesAte(prazo);
    if (!meses) return null;

    const restante = Math.max(0, valorObjetivo - valorAtual);

    return { meses, aporte: restante / meses };
  }, [prazo, valorObjetivo, valorAtual]);

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const corpo = {
      nome: nome.trim(),
      valor_objetivo: valorObjetivo,
      valor_atual: atual === "" ? 0 : valorAtual,
      prazo: prazo === "" ? null : prazo,
    };

    try {
      if (editando) {
        await api.put(`/metas/${meta.id}`, corpo);
      } else {
        await api.post("/metas", corpo);
      }

      onSalvo(editando ? "Meta atualizada." : "Meta criada.");
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
      titulo={editando ? "Editar meta" : "Nova meta"}
      rotuloConfirmar={editando ? "Salvar alterações" : "Criar meta"}
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

        <Field label="Nome da meta" obrigatorio erro={erro?.campos?.nome}>
          {(a) => (
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              placeholder="Reserva de emergência"
              autoFocus
              {...a}
            />
          )}
        </Field>

        <Field
          label="Quanto quero juntar"
          obrigatorio
          erro={erro?.campos?.valor_objetivo}
        >
          {(a) => (
            <InputMoeda
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              {...a}
            />
          )}
        </Field>

        <Field
          label="Quanto já tenho guardado"
          erro={erro?.campos?.valor_atual ?? (acimaDoObjetivo ? "Não pode ser maior que o objetivo." : undefined)}
          ajuda="Deixe em branco se ainda não começou."
        >
          {(a) => (
            <InputMoeda value={atual} onChange={(e) => setAtual(e.target.value)} {...a} />
          )}
        </Field>

        <Field
          label="Prazo"
          erro={erro?.campos?.prazo}
          ajuda="Opcional. Sem prazo, a meta não entra no cálculo de quanto você pode gastar."
        >
          {(a) => (
            <Input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              {...a}
            />
          )}
        </Field>

        {previa && (
          <div className="cf-aviso" role="status">
            <div className="cf-aviso__texto">
              <p className="cf-aviso__titulo">
                Você precisa guardar {formatarMoeda(previa.aporte)} por mês
              </p>
              <p className="cf-aviso__descricao">
                Para fechar a meta no prazo, ao longo de {previa.meses}{" "}
                {previa.meses === 1 ? "mês" : "meses"}. Esse valor é descontado da
                estimativa de quanto você pode gastar.
              </p>
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
