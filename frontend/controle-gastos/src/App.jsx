import { BrowserRouter, Routes, Route } from "react-router-dom";
import Controle from "./pages/Controle";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { SalarioProvider } from "./Context/SalarioContext";
import { GastosProvider } from "./Context/GastosContext";

export default function App() {
  return (
    <BrowserRouter>
      <SalarioProvider>
      <GastosProvider>
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/controle" element={<Controle />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
      </GastosProvider>
      </SalarioProvider>
    </BrowserRouter>
  );
}
