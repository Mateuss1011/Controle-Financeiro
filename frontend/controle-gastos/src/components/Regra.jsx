import React, { useEffect, useState } from "react";
import { useSalario } from "../Context/useSalario";

export default function Regra() {
  const { salario } = useSalario(); // 🔥 pega o salário do contexto
  const [valores, setValores] = useState({
    necessidades: 0,
    desejos: 0,
    poupanca: 0,
  });

  // recalcula sempre que o salário mudar
  useEffect(() => {
    if (salario > 0) {
      setValores({
        necessidades: salario * 0.5,
        desejos: salario * 0.3,
        poupanca: salario * 0.2,
      });
    }
  }, [salario]);

  const formatar = (valor) =>
    valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <h5 className="card-title fw-bold mb-3">Regra 50/30/20</h5>

        <div className="d-flex justify-content-between mb-2">
          <span>Necessidades (50%):</span>
          <span className="text-success fw-bold">
            {formatar(valores.necessidades)}
          </span>
        </div>

        <div className="d-flex justify-content-between mb-2">
          <span>Desejos (30%):</span>
          <span className="text-primary fw-bold">
            {formatar(valores.desejos)}
          </span>
        </div>

        <div className="d-flex justify-content-between mb-1">
          <span>Poupança (20%):</span>
          <span className="text-warning fw-bold">
            {formatar(valores.poupanca)}
          </span>
        </div>
      </div>
    </div>
  );
}
