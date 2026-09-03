import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "../../components/ui";
import { useAuth } from "./authContext";

/**
 * Rotas de entrada (login e cadastro).
 *
 * Quem já está autenticado não deve ver o formulário de login de novo — é uma
 * pequena confusão que acontece o tempo todo com o botão "voltar" do navegador.
 */
export default function RotaPublica() {
  const { usuario, verificandoSessao } = useAuth();
  const localizacao = useLocation();

  if (verificandoSessao) {
    return (
      <div className="cf-verificando" role="status">
        <Spinner tamanho={28} rotulo="Verificando sua sessão" />
      </div>
    );
  }

  if (usuario) {
    return <Navigate to={localizacao.state?.de ?? "/dashboard"} replace />;
  }

  return <Outlet />;
}
