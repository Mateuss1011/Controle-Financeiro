import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RendasPage from "./features/rendas/RendasPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import LancamentosPage from "./features/lancamentos/LancamentosPage";
import MetasPage from "./features/metas/MetasPage";
import OrcamentoPage from "./features/orcamento/OrcamentoPage";
import RelatoriosPage from "./features/relatorios/RelatoriosPage";
import NaoEncontrada from "./pages/NaoEncontrada";
import AuthProvider from "./features/auth/AuthProvider";
import CadastroPage from "./features/auth/CadastroPage";
import LoginPage from "./features/auth/LoginPage";
import RotaProtegida from "./features/auth/RotaProtegida";
import RotaPublica from "./features/auth/RotaPublica";
import { ToastProvider } from "./components/ui";
import Spinner from "./components/ui/Spinner";

// Guia vivo do Design System: só existe em desenvolvimento. O import dinâmico
// mantém a página inteira fora do bundle de produção.
const DesignSystem = import.meta.env.DEV
  ? lazy(() => import("./pages/DesignSystem"))
  : null;

/*
 * Duas árvores de rotas:
 *
 *   RotaPublica   — login e cadastro; quem já está autenticado é mandado adiante
 *   RotaProtegida — tudo que toca dinheiro; monta a casca de navegação e só
 *                   então os providers financeiros
 *
 * O ToastProvider fica acima de tudo para que o aviso de "você saiu da conta"
 * sobreviva à troca de rota que acontece no mesmo instante.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<RotaPublica />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cadastro" element={<CadastroPage />} />
            </Route>

            <Route element={<RotaProtegida />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/lancamentos" element={<LancamentosPage />} />
              <Route path="/renda" element={<RendasPage />} />
              <Route path="/orcamento" element={<OrcamentoPage />} />
              <Route path="/metas" element={<MetasPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              {/* Endereço antigo, preservado para quem tiver o link salvo. */}
              <Route path="/controle" element={<Navigate to="/lancamentos" replace />} />

              {DesignSystem && (
                <Route
                  path="/design-system"
                  element={
                    <Suspense fallback={<Spinner />}>
                      <DesignSystem />
                    </Suspense>
                  }
                />
              )}

              <Route path="*" element={<NaoEncontrada />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
