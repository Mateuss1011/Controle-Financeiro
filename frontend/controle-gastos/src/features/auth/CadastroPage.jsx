import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";
import { Button, Field, Input, useToast } from "../../components/ui";
import { Stack } from "../../components/layout";
import { extrairErro } from "../../lib/erros";
import AuthLayout from "./AuthLayout";
import CampoSenha from "./CampoSenha";
import { useAuth } from "./authContext";

/** Mesma regra do RegisterRequest: mínimo 8 caracteres, com letras e números. */
const REGRA_SENHA = "Mínimo de 8 caracteres, com letras e números.";

function senhaAtendeRegra(senha) {
  return senha.length >= 8 && /[a-zA-Z]/.test(senha) && /\d/.test(senha);
}

export default function CadastroPage() {
  const { cadastrar } = useAuth();
  const navegar = useNavigate();
  const localizacao = useLocation();
  const toast = useToast();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(localizacao.state?.email ?? "");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  /*
   * Validação local antes de enviar, para quem digita não descobrir só depois
   * do ida-e-volta que a senha era curta ou que a confirmação não bate. O
   * servidor continua sendo a autoridade — isto é conveniência, não segurança.
   */
  const senhaInvalida = senha !== "" && !senhaAtendeRegra(senha);
  const confirmacaoInvalida = confirmacao !== "" && senha !== confirmacao;

  const podeEnviar =
    nome.trim() !== "" &&
    email.trim() !== "" &&
    senhaAtendeRegra(senha) &&
    senha === confirmacao;

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const usuario = await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        confirmacao,
      });

      toast.sucesso(`Conta criada. Bem-vindo, ${usuario.name.split(" ")[0]}!`);
      navegar("/dashboard", { replace: true });
    } catch (error) {
      setErro(extrairErro(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Criar conta"
      descricao="Comece a organizar suas finanças em menos de um minuto."
      rodape={
        <>
          Já tem uma conta?{" "}
          <Link className="cf-auth__link" to="/login" state={{ email }}>
            Entrar
          </Link>
        </>
      }
    >
      {erro?.mensagem && (
        <div className="cf-auth__alerta" role="alert">
          <FiAlertCircle aria-hidden="true" />
          <span>{erro.mensagem}</span>
        </div>
      )}

      <form onSubmit={aoEnviar} noValidate>
        <Stack>
          <Field label="Nome" obrigatorio erro={erro?.campos?.name}>
            {(a) => (
              <Input
                name="name"
                autoComplete="name"
                autoFocus
                placeholder="Como podemos te chamar"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                {...a}
              />
            )}
          </Field>

          <Field label="E-mail" obrigatorio erro={erro?.campos?.email}>
            {(a) => (
              <Input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...a}
              />
            )}
          </Field>

          <Field
            label="Senha"
            obrigatorio
            ajuda={REGRA_SENHA}
            erro={erro?.campos?.password ?? (senhaInvalida ? REGRA_SENHA : undefined)}
          >
            {(a) => (
              <CampoSenha
                name="password"
                autoComplete="new-password"
                placeholder="Crie uma senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                {...a}
              />
            )}
          </Field>

          <Field
            label="Confirmar senha"
            obrigatorio
            erro={confirmacaoInvalida ? "As senhas não conferem." : undefined}
          >
            {(a) => (
              <CampoSenha
                name="password_confirmation"
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                {...a}
              />
            )}
          </Field>

          <Button
            type="submit"
            larguraTotal
            tamanho="lg"
            carregando={enviando}
            disabled={!podeEnviar}
          >
            {enviando ? "Criando conta…" : "Criar conta"}
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
}
