import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import { Field, Input, InputMoeda, Modal, Select } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import { competenciaAtual, formatarCompetencia, formatarMoeda } from "../../../lib/format";

/** Competências oferecidas: 18 meses para trás e 3 para frente. */
function competenciasDisponiveis() {
  const hoje = new Date();
  const lista = [];

  for (let i = 3; i >= -18; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    lista.push(`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`);
  }

  return lista;
}

/**
 * Registro da renda de uma competência.
 *
 * Não existe "criar" e "editar" separados: o endpoint é um upsert por
 * competência, que é justamente a regra de unicidade definida na Fase B.
 * Registrar de novo o mesmo mês atualiza o valor — e o formulário avisa isso
 * antes de enviar, para a substituição nunca ser surpresa.
 */
export default function FormularioRenda({ aberto, renda, rendasExistentes, onFechar, onSalvo }) {
  const [valor, setValor] = useState("");
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(renda?.id);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setValor(renda ? String(renda.valor) : "");
    setCompetencia(renda?.competencia ?? competenciaAtual());
    setDescricao(renda?.descricao ?? "");
  }, [aberto, renda]);

  const competencias = useMemo(competenciasDisponiveis, []);

  /* Ao escolher um mês que já tem renda, o envio vai SUBSTITUIR o valor. */
  const jaRegistrada = useMemo(
    () =>
      !editando
        ? rendasExistentes?.find((r) => r.competencia === competencia)
        : null,
    [editando, rendasExistentes, competencia]
  );

  const podeSalvar = valor !== "" && Number(valor) >= 0 && competencia !== "";

  async function salvar() {
    setErro(null);
    setSalvando(true);

    try {
      await api.post("/rendas", {
        valor: Number(valor),
        competencia,
        descricao: descricao.trim() || null,
      });

      onSalvo(
        editando || jaRegistrada
          ? `Renda de ${formatarCompetencia(competencia)} atualizada.`
          : `Renda de ${formatarCompetencia(competencia)} registrada.`
      );
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
      titulo={editando ? "Editar renda" : "Registrar renda"}
      rotuloConfirmar={editando ? "Salvar alterações" : "Registrar"}
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
          label="Competência"
          obrigatorio
          erro={erro?.campos?.competencia}
          ajuda={editando ? "A competência de uma renda já registrada não muda." : undefined}
        >
          {(a) => (
            <Select
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              disabled={editando}
              {...a}
            >
              {competencias.map((mes) => (
                <option key={mes} value={mes}>
                  {formatarCompetencia(mes)}
                  {mes === competenciaAtual() ? " (atual)" : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Valor recebido"
          obrigatorio
          erro={erro?.campos?.valor}
          ajuda="É a base dos limites da regra 50/30/20 e da sua saúde financeira."
        >
          {(a) => (
            <InputMoeda value={valor} onChange={(e) => setValor(e.target.value)} autoFocus {...a} />
          )}
        </Field>

        <Field
          label="Descrição"
          erro={erro?.campos?.descricao}
          ajuda="Opcional. Ex.: salário, freelas, 13º."
        >
          {(a) => (
            <Input
              placeholder="De onde veio esta renda"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              {...a}
            />
          )}
        </Field>

        {jaRegistrada && (
          <div className="cf-aviso cf-aviso--atencao" role="status">
            <div className="cf-aviso__texto">
              <p className="cf-aviso__titulo">
                {formatarCompetencia(competencia)} já tem renda registrada
              </p>
              <p className="cf-aviso__descricao">
                O valor atual, {formatarMoeda(jaRegistrada.valor)}, será substituído.
                Cada competência tem uma única renda.
              </p>
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
