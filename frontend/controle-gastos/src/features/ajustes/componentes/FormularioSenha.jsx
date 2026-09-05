import { useState } from "react";
import { Button, Card, Field, Input, useToast } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import "./ajustes.css";

const MINIMO = 8;

/**
 * Troca de senha.
 *
 * A senha atual é pedida mesmo com a sessão aberta: um computador deixado
 * desbloqueado não pode virar troca de senha, que é o que transforma um acesso
 * temporário num sequestro permanente da conta.
 *
 * As outras sessões caem junto — se a troca aconteceu porque a senha vazou,
 * manter os outros dispositivos conectados anularia o motivo dela. O aviso
 * aparece antes do envio, não depois.
 */
export default function FormularioSenha() {
  const toast = useToast();

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const curta = nova !== "" && nova.length < MINIMO;
  const naoConfere = confirmacao !== "" && nova !== confirmacao;
  const repetida = nova !== "" && nova === atual;

  const podeSalvar =
    atual !== "" &&
    nova.length >= MINIMO &&
    nova === confirmacao &&
    !repetida;

  async function salvar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const { data } = await api.put("/perfil/senha", {
        senha_atual: atual,
        senha: nova,
        senha_confirmation: confirmacao,
      });

      setAtual("");
      setNova("");
      setConfirmacao("");

      toast.sucesso(
        data.sessoes_encerradas > 0
          ? `Senha alterada. ${data.sessoes_encerradas} ${
              data.sessoes_encerradas === 1 ? "outra sessão foi encerrada" : "outras sessões foram encerradas"
            }.`
          : "Senha alterada com sucesso."
      );
    } catch (error) {
      setErro(extrairErro(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card titulo="Senha" descricao="Troque sua senha de acesso.">
      <form className="cf-ajustes__form" onSubmit={salvar} noValidate>
        <Stack>
          {erro?.mensagem && Object.keys(erro.campos ?? {}).length === 0 && (
            <div className="cf-auth__alerta" role="alert">
              <span>{erro.mensagem}</span>
            </div>
          )}

          <Field label="Senha atual" obrigatorio erro={erro?.campos?.senha_atual}>
            {(a) => (
              <Input
                type="password"
                value={atual}
                onChange={(e) => setAtual(e.target.value)}
                autoComplete="current-password"
                {...a}
              />
            )}
          </Field>

          <Field
            label="Nova senha"
            obrigatorio
            erro={
              erro?.campos?.senha ??
              (curta ? `Use pelo menos ${MINIMO} caracteres.` : undefined) ??
              (repetida ? "A nova senha precisa ser diferente da atual." : undefined)
            }
            ajuda={`Mínimo de ${MINIMO} caracteres.`}
          >
            {(a) => (
              <Input
                type="password"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                autoComplete="new-password"
                {...a}
              />
            )}
          </Field>

          <Field
            label="Confirme a nova senha"
            obrigatorio
            erro={naoConfere ? "A confirmação não confere." : undefined}
          >
            {(a) => (
              <Input
                type="password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                {...a}
              />
            )}
          </Field>

          <p className="cf-ajustes__nota">
            Ao trocar a senha, as sessões abertas em outros dispositivos são
            encerradas. Esta continua conectada.
          </p>

          <div className="cf-ajustes__acoes">
            <Button type="submit" disabled={!podeSalvar} carregando={salvando}>
              Alterar senha
            </Button>
          </div>
        </Stack>
      </form>
    </Card>
  );
}
