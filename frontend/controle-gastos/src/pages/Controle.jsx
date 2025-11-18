import React from "react";
import SalarioMensal from "../components/SalarioMensal";
import Resumo from "../components/Resumo";
import AdicionarGasto from "../components/AdicionarGasto";
import Regra from "../components/Regra";
import Lancamentos from "../components/Lancamentos";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleVoltar = () => {
    navigate("/"); // volta pra tela de login
  };

  return (
    <div className="container my-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div className="d-flex align-items-center gap-2">
          <Button variant="light" size="sm" onClick={handleVoltar}>
            ← Voltar
          </Button>
          <div>
            <h4 className="fw-bold mb-0">Controle Financeiro</h4>
            <small className="text-muted">
              Gerencie seus gastos mensais
            </small>
          </div>
        </div>

        <Button
          variant="dark"
          size="sm"
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </Button>
      </div>

      {/* Linha 1 */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <SalarioMensal />
        </div>
        <div className="col-md-6 mb-3">
          <Resumo />
        </div>
      </div>

      {/* Linha 2 */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <AdicionarGasto />
        </div>
        <div className="col-md-6 mb-3">
          <Regra />
        </div>
      </div>

      {/* Linha 3 */}
      <div className="row">
        <div className="col-12">
          <Lancamentos />
        </div>
      </div>
    </div>
  );
}
