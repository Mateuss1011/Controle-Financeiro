import { useEffect, useState } from "react";
import { Button, Card, Field, Input, useToast } from "../../../components/ui";
import { Stack } from "../../../components/layout";
import api from "../../../services/api";
import { extrairErro } from "../../../lib/erros";
import { useAuth } from "../../auth/authContext";
import "./ajustes.css";

function iniciais(nome) {
  return (nome ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

/**
 * Nome e e-mail da conta.
 *
 * O e-mail é a credencial de login, então trocá-lo muda como se entra na conta
 * — o formulário diz isso antes de salvar, e só quando o campo realmente mudou.
 */
export default function FormularioPerfil() {
  const toast = useToast();
  const { usuario, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setNome(usuario?.name ?? "");
    setEmail(usuario?.email ?? "");
    setSenha("");
  }, [usuario]);

  const mudou = nome !== (usuario?.name ?? "") || email !== (usuario?.email ?? "");
  const emailMudou = email !== (usuario?.email ?? "");
  const podeSalvar =
    mudou &&
    nome.trim() !== "" &&
    email.trim() !== "" &&
    // A senha só é barreira quando o e-mail muda; trocar o nome nunca a pede.
    (!emailMudou || senha !== "");

  async function salvar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const { data } = await api.patch("/perfil", {
        name: nome.trim(),
        email: email.trim(),
        // Só acompanha a requisição que de fato troca a credencial. O backend
        // decide sozinho, comparando com o e-mail gravado — isto aqui é
        // conveniência, não a regra.
        ...(emailMudou ? { senha_atual: senha } : {}),
      });

      atualizarUsuario(data.data);
      setSenha("");
      toast.sucesso("Perfil atualizado.");
    } catch (error) {
      setErro(extrairErro(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card titulo="Perfil" descricao="Como você aparece no aplicativo.">
      <div className="cf-ajustes__identidade">
        <span className="cf-ajustes__avatar" aria-hidden="true">
          {iniciais(usuario?.name)}
        </span>
        <span className="cf-ajustes__quem">
          <span className="cf-ajustes__nome">{usuario?.name ?? "—"}</span>
          <span className="cf-ajustes__email">{usuario?.email ?? ""}</span>
        </span>
      </div>

      <form className="cf-ajustes__form" onSubmit={salvar} noValidate>
        <Stack>
          {erro?.mensagem && Object.keys(erro.campos ?? {}).length === 0 && (
            <div className="cf-auth__alerta" role="alert">
              <span>{erro.mensagem}</span>
            </div>
          )}

          <Field label="Nome" obrigatorio erro={erro?.campos?.name}>
            {(a) => (
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={255}
                autoComplete="name"
                {...a}
              />
            )}
          </Field>

          <Field
            label="E-mail"
            obrigatorio
            erro={erro?.campos?.email}
            ajuda={
              emailMudou
                ? "Este é o e-mail que você usa para entrar: depois de salvar, o login passa a ser com o novo."
                : undefined
            }
          >
            {(a) => (
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                autoComplete="email"
                {...a}
              />
            )}
          </Field>

          {/*
            * O campo só existe quando a credencial vai mudar: pedir senha para
            * trocar o nome seria atrito sem motivo.
            *
            * "Confirme sua senha", e não "Senha atual": o cartão de Senha, logo
            * abaixo, já tem um campo com esse rótulo. Dois campos com o mesmo
            * nome na mesma página deixam quem navega por leitor de tela sem
            * saber a qual formulário cada um pertence.
            */}
          {emailMudou && (
            <Field
              label="Confirme sua senha"
              obrigatorio
              erro={erro?.campos?.senha_atual}
              ajuda="Necessária para trocar o e-mail de acesso."
            >
              {(a) => (
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  {...a}
                />
              )}
            </Field>
          )}

          <div className="cf-ajustes__acoes">
            <Button type="submit" disabled={!podeSalvar} carregando={salvando}>
              Salvar alterações
            </Button>
            {!mudou && (
              <span className="cf-ajustes__nota">Nada para salvar.</span>
            )}
          </div>
        </Stack>
      </form>
    </Card>
  );
}
