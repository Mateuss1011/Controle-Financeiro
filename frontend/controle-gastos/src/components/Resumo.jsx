import React, { useEffect, useState } from "react";
import { useSalario } from "../Context/useSalario";
import { useGastos } from "../Context/GastosContext";

export default function Resumo() {
  const { salario } = useSalario();
  const { gastos } = useGastos();

  const [totalGastos, setTotalGastos] = useState(0);

  
  useEffect(() => {
    if (gastos && gastos.length > 0) {
      const soma = gastos.reduce(
        (total, gasto) => total + parseFloat(gasto.valor),
        0
      );
      setTotalGastos(soma);
    } else {
      setTotalGastos(0);
    }
  }, [gastos]);

  const saldoFinal = salario - totalGastos;

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <h5 className="card-title fw-bold mb-3">Resumo</h5>

        <div className="d-flex justify-content-between mb-1">
          <span>Salário:</span>
          <span className="text-success">R$ {salario.toFixed(2)}</span>
        </div>

        <div className="d-flex justify-content-between mb-1">
          <span>Total de Gastos:</span>
          <span className="text-danger">R$ {totalGastos.toFixed(2)}</span>
        </div>

        <div className="d-flex justify-content-between fw-bold mt-2 border-top pt-2">
          <span>Saldo Final:</span>
          <span className={saldoFinal >= 0 ? "text-success" : "text-danger"}>
            R$ {saldoFinal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
