import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Controle from "./pages/Controle";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { SalarioProvider } from "./Context/SalarioProvider";
import { GastosProvider } from "./Context/GastosProvider";
import { ToastProvider } from "./components/ui";
import Spinner from "./components/ui/Spinner";

// Guia vivo do Design System: só existe em desenvolvimento. O import dinâmico
// mantém a página inteira fora do bundle de produção.
const DesignSystem = import.meta.env.DEV
  ? lazy(() => import("./pages/DesignSystem"))
  : null;

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SalarioProvider>
          <GastosProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/controle" element={<Controle />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {DesignSystem && (
                <Route
                  path="/design-system"
                  element={
                    <Suspense fallback={<div style={{ padding: "2rem" }}><Spinner /></div>}>
                      <DesignSystem />
                    </Suspense>
                  }
                />
              )}
            </Routes>
          </GastosProvider>
        </SalarioProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
