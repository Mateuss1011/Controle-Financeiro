import { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const SalarioContext = createContext();

export function SalarioProvider({ children }) {
  const [salario, setSalario] = useState(0);
  const [salarioId, setSalarioId] = useState(null);

  useEffect(() => {
    carregarSalario();
  }, []);

  const carregarSalario = async () => {
    try {
      const response = await api.get("/salarios");

      if (response.data.length > 0) {
        const maisRecente = response.data[0];

        setSalario(parseFloat(maisRecente.valor));
        setSalarioId(maisRecente.id);
      }
    } catch (error) {
      console.error("Erro ao carregar salário no Context:", error);
    }
  };

  const atualizarSalario = async (valor) => {
    try {
      if (salarioId) {
        await api.put(`/salarios/${salarioId}`, { valor });
      } else {
        const res = await api.post("/salarios", { valor });
        setSalarioId(res.data.id);
      }

      setSalario(parseFloat(valor)); // Atualiza o contexto
    } catch (error) {
      console.error("Erro ao atualizar salário no Context:", error);
    }
  };

  return (
    <SalarioContext.Provider value={{ salario, salarioId, atualizarSalario }}>
      {children}
    </SalarioContext.Provider>
  );
}
