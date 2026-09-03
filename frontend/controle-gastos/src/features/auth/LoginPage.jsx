import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";
import { Button, Field, Input } from "../../components/ui";
import { Stack } from "../../components/layout";
import { extrairErro } from "../../lib/erros";
import AuthLayout from "./AuthLayout";
import CampoSenha from "./CampoSenha";
import { useAuth } from "./authContext";

export default function LoginPage() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const localizacao = useLocation();

  // O e-mail sobrevive à ida e volta entre login e cadastro.
  const [email, setEmail] = useState(localizacao.state?.email ?? "");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const destino = localizacao.state?.de ?? "/dashboard";

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      await entrar(email.trim(), senha);
      navegar(destino, { replace: true });
    } catch (error) {
      setErro(extrairErro(error));
      setSenha("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Entrar"
      descricao="Acesse sua conta para acompanhar suas finanças."
      rodape={
        <>
          Ainda não tem conta?{" "}
          <Link className="cf-auth__link" to="/cadastro" state={{ email }}>
            Criar conta
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
          <Field label="E-mail" erro={erro?.campos?.email}>
            {(acessibilidade) => (
              <Input
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...acessibilidade}
              />
            )}
          </Field>

          <Field label="Senha" erro={erro?.campos?.password}>
            {(acessibilidade) => (
              <CampoSenha
                name="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                {...acessibilidade}
              />
            )}
          </Field>

          <Button
            type="submit"
            larguraTotal
            tamanho="lg"
            carregando={enviando}
            disabled={!email || !senha}
          >
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
}
