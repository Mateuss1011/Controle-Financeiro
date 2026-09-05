import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NaoEncontrada from "./pages/NaoEncontrada";
import AuthProvider from "./features/auth/AuthProvider";
import CadastroPage from "./features/auth/CadastroPage";
import LoginPage from "./features/auth/LoginPage";
import RotaProtegida from "./features/auth/RotaProtegida";
import RotaPublica from "./features/auth/RotaPublica";
import { ToastProvider } from "./components/ui";
import Spinner from "./components/ui/Spinner";

/*
 * As telas autenticadas são carregadas SOB DEMANDA; login e cadastro, não.
 *
 * Quem chega sem sessão vê a tela de login, e era ela que pagava por tudo:
 * o recharts e as suas dependências (d3, decimal.js-light, a pilha de Redux que
 * o recharts 3 usa por dentro) somavam a maior fatia do pacote inicial, para
 * desenhar gráficos que só existem no Dashboard e em Relatórios.
 *
 * Login e cadastro ficam estáticos de propósito: são a porta de entrada, e
 * carregá-los sob demanda trocaria bytes por uma ida e volta antes do primeiro
 * pixel — o oposto do objetivo.
 */
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"));
const LancamentosPage = lazy(() => import("./features/lancamentos/LancamentosPage"));
const RendasPage = lazy(() => import("./features/rendas/RendasPage"));
const OrcamentoPage = lazy(() => import("./features/orcamento/OrcamentoPage"));
const MetasPage = lazy(() => import("./features/metas/MetasPage"));
const RelatoriosPage = lazy(() => import("./features/relatorios/RelatoriosPage"));
const CategoriasPage = lazy(() => import("./features/categorias/CategoriasPage"));
const AjustesPage = lazy(() => import("./features/ajustes/AjustesPage"));

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
              <Route path="/categorias" element={<CategoriasPage />} />
              <Route path="/ajustes" element={<AjustesPage />} />
              {/* Endereço antigo do menu, preservado para links salvos. */}
              <Route path="/configuracoes" element={<Navigate to="/ajustes" replace />} />
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
