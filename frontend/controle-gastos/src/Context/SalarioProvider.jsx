import { useState, useEffect } from "react";
import api from "../services/api";
import { SalarioContext } from "./salarioContext";

export function SalarioProvider({ children }) {
  const [salario, setSalario] = useState(0);
  const [salarioId, setSalarioId] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    carregarSalario();
  }, []);

  const carregarSalario = async () => {
    try {
      // O histórico vem ordenado da competência mais recente para a mais antiga.
      const response = await api.get("/rendas");
      const rendas = response.data.data;

      if (rendas.length > 0) {
        setSalario(parseFloat(rendas[0].valor));
        setSalarioId(rendas[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar renda no Context:", error);
    }
  };

  const atualizarSalario = async (valor) => {
    try {
      // O POST é um upsert por competência: registrar duas vezes no mesmo mês
      // atualiza o registro em vez de criar outro.
      const res = await api.post("/rendas", { valor });

      setSalarioId(res.data.data.id);
      setSalario(parseFloat(res.data.data.valor));
    } catch (error) {
      console.error("Erro ao atualizar renda no Context:", error);
      throw error;
    }
  };

  return (
    <SalarioContext.Provider value={{ salario, salarioId, atualizarSalario }}>
      {children}
    </SalarioContext.Provider>
  );
}
