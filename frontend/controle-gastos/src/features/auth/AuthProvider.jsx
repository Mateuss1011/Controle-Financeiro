import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  EVENTO_SESSAO_EXPIRADA,
  gravarToken,
  lerToken,
  limparToken,
} from "../../services/sessao";
import { AuthContext } from "./authContext";

/**
 * Estado de autenticação da aplicação.
 *
 * Um ponto importante do boot: ter um token guardado não significa estar
 * autenticado. Os tokens passaram a expirar em 7 dias na Fase B, e o token
 * também pode ter sido revogado num logout em outro dispositivo. Por isso, ao
 * abrir o app, o token é VALIDADO contra /me antes de considerarmos o usuário
 * logado — em vez de mostrar a interface e só descobrir o problema no primeiro
 * 401, com a tela já montada e vazia.
 */
export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(Boolean(lerToken()));

  useEffect(() => {
    if (!lerToken()) return;

    let ativo = true;

    api
      .get("/me")
      .then((resposta) => {
        if (ativo) setUsuario(resposta.data.data);
      })
      .catch(() => {
        limparToken();
        if (ativo) setUsuario(null);
      })
      .finally(() => {
        if (ativo) setVerificandoSessao(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  // Qualquer 401 vindo de qualquer requisição derruba a sessão em memória.
  useEffect(() => {
    const aoExpirar = () => setUsuario(null);

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  const aplicarSessao = useCallback((dados) => {
    gravarToken(dados.token);
    setUsuario(dados.user);
  }, []);

  const entrar = useCallback(
    async (email, senha) => {
      const { data } = await api.post("/login", { email, password: senha });
      aplicarSessao({ token: data.token, user: data.user });

      return data.user;
    },
    [aplicarSessao]
  );

  const cadastrar = useCallback(
    async ({ nome, email, senha, confirmacao }) => {
      const { data } = await api.post("/register", {
        name: nome,
        email,
        password: senha,
        password_confirmation: confirmacao,
      });
      aplicarSessao({ token: data.token, user: data.user });

      return data.user;
    },
    [aplicarSessao]
  );

  /**
   * Substitui o usuário em memória depois de uma edição de perfil.
   *
   * Sem isto, trocar o nome em Ajustes deixava a saudação do Dashboard e o
   * rodapé da barra lateral com o nome antigo até o próximo recarregamento —
   * dando a impressão de que o salvamento não pegou.
   */
  const atualizarUsuario = useCallback((dados) => {
    setUsuario((atual) => ({ ...atual, ...dados }));
  }, []);

  const sair = useCallback(async () => {
    try {
      // Revoga o token no servidor. Se a chamada falhar (rede fora, token já
      // expirado), a sessão local cai do mesmo jeito: sair nunca pode travar.
      await api.post("/logout");
    } catch {
      // Silêncio proposital.
    } finally {
      limparToken();
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      autenticado: Boolean(usuario),
      verificandoSessao,
      entrar,
      cadastrar,
      sair,
      atualizarUsuario,
    }),
    [usuario, verificandoSessao, entrar, cadastrar, sair, atualizarUsuario]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
