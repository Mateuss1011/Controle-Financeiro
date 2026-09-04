import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout";
import { Spinner, useToast } from "../../components/ui";
import { GastosProvider } from "../../Context/GastosProvider";
import LancamentosProvider from "../lancamentos/LancamentosProvider";
import { useLancamentosGlobais } from "../lancamentos/lancamentosContext";
import { SalarioProvider } from "../../Context/SalarioProvider";
import { useAuth } from "./authContext";

/**
 * Guarda da área autenticada.
 *
 * Os providers financeiros vivem DENTRO dela, e não na raiz da aplicação: antes
 * o GastosProvider e o SalarioProvider montavam junto com a tela de login e
 * disparavam /categorias, /gastos e /salarios sem token. Aqui eles só existem
 * depois que há um usuário confirmado.
 */
export default function RotaProtegida() {
  const { usuario, verificandoSessao, sair } = useAuth();
  const navegar = useNavigate();
  const localizacao = useLocation();
  const toast = useToast();

  if (verificandoSessao) {
    return (
      <div className="cf-verificando" role="status">
        <Spinner tamanho={28} rotulo="Verificando sua sessão" />
        <p>Verificando sua sessão…</p>
      </div>
    );
  }

  if (!usuario) {
    // `de` guarda a rota pedida para o login devolver o usuário exatamente
    // onde ele estava tentando chegar.
    return <Navigate to="/login" replace state={{ de: localizacao.pathname }} />;
  }

  const aoSair = async () => {
    await sair();
    toast.sucesso("Você saiu da sua conta.");
    navegar("/login", { replace: true });
  };

  return (
    <SalarioProvider>
      <GastosProvider>
        <LancamentosProvider>
          <Casca usuario={usuario} onSair={aoSair} />
        </LancamentosProvider>
      </GastosProvider>
    </SalarioProvider>
  );
}

/**
 * Componente separado só para poder consumir o LancamentosProvider que o pai
 * acabou de montar: "+ Novo lançamento" abre o formulário global, em qualquer
 * tela, em vez de navegar para outra página.
 */
function Casca({ usuario, onSair }) {
  const { abrirNovo } = useLancamentosGlobais();

  return (
    <AppShell usuario={usuario} onSair={onSair} onNovoLancamento={abrirNovo}>
      <Outlet />
    </AppShell>
  );
}
