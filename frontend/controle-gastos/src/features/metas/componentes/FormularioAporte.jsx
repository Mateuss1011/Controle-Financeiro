import { useEffect, useState } from "react";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import { Field, InputMoeda, Modal } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import { formatarMoeda, numero } from "../../../lib/format";

/**
 * Registro rápido do que foi guardado.
 *
 * Existe separado do formulário completo porque é a ação mais frequente da
 * tela — e a única que o usuário faz sem querer rever objetivo e prazo. O valor
 * digitado é SOMADO ao acumulado, que é como as pessoas pensam ("guardei mais
 * R$ 200"), e o total resultante aparece antes de confirmar para não haver
 * dúvida sobre a soma.
 */
export default function FormularioAporte({ aberto, meta, onFechar, onSalvo }) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setValor("");
  }, [aberto, meta]);

  if (!meta) return null;

  const aporte = numero(valor);
  // O acumulado nunca passa do objetivo: uma meta "115% concluída" não
  // significa nada, e o backend rejeitaria.
  const novoTotal = Math.min(meta.valor_objetivo, meta.valor_atual + aporte);
  const excedeu = meta.valor_atual + aporte > meta.valor_objetivo;
  const podeSalvar = valor !== "" && aporte > 0;

  async function salvar() {
    setErro(null);
    setSalvando(true);

    try {
      await api.put(`/metas/${meta.id}`, { valor_atual: novoTotal });

      onSalvo(
        novoTotal >= meta.valor_objetivo
          ? `Meta "${meta.nome}" concluída!`
          : "Valor guardado registrado."
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
      titulo={`Guardei mais em "${meta.nome}"`}
      rotuloConfirmar="Registrar"
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
          label="Quanto você guardou agora"
          obrigatorio
          erro={erro?.campos?.valor_atual}
          ajuda={`Hoje há ${formatarMoeda(meta.valor_atual)} de ${formatarMoeda(
            meta.valor_objetivo
          )}.`}
        >
          {(a) => (
            <InputMoeda
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
              {...a}
            />
          )}
        </Field>

        {podeSalvar && (
          <div className="cf-aviso" role="status">
            <div className="cf-aviso__texto">
              <p className="cf-aviso__titulo">
                O total guardado passa a ser {formatarMoeda(novoTotal)}
              </p>
              <p className="cf-aviso__descricao">
                {excedeu
                  ? `O valor informado passa do objetivo, então gravamos exatamente ${formatarMoeda(
                      meta.valor_objetivo
                    )} e a meta é concluída.`
                  : `Faltarão ${formatarMoeda(meta.valor_objetivo - novoTotal)} para concluir.`}
              </p>
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
